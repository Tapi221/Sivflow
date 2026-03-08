import { strictValidateBeforeSave } from "@/utils/imageValidation";
import type { UploadedImage } from "@/types";
import { auth, firestoreDb } from "@/services/firebase";
import { getLocalDb } from "@/services/localDB";
import { doc, setDoc, getDoc, writeBatch } from "firebase/firestore";
import { imageDocPathSegments } from "@/services/firestorePaths";

type FirestoreTarget = {
  uid: string;
  path: string;
  pathSegments: string[];
};

const USER_STORAGE_PATH_RE = /^users\/([^/]+)\//i;

const extractUidFromStoragePath = (
  storagePath?: string | null,
): string | null => {
  if (typeof storagePath !== "string") return null;
  const trimmed = storagePath.trim();
  if (!trimmed) return null;
  const match = USER_STORAGE_PATH_RE.exec(trimmed);
  return match?.[1] ?? null;
};

const FIRESTORE_DIAGNOSTIC_FLAG = "flashcard.firestore.diagnostics";

const isFirestoreDiagnosticsEnabled = (): boolean => {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FIRESTORE_DIAGNOSTIC_FLAG) === "1";
  } catch {
    return false;
  }
};

/**
 * DB保存の統一インターフェース（全パスで必須）
 * すべての画像DB保存はこのクラスを経由する
 */
class ImageDatabaseWriter {
  private readonly inFlightTouchMigrations = new Set<string>();

  isFirestoreDiagnosticsEnabled(): boolean {
    return isFirestoreDiagnosticsEnabled();
  }

  resolveFirestoreTarget(
    image: UploadedImage,
    explicitUid?: string,
  ): FirestoreTarget {
    const authUid = auth.currentUser?.uid?.trim() || null;
    const uidFromStoragePath = extractUidFromStoragePath(image.storagePath);
    const uidFromArg = explicitUid?.trim() || null;
    const uid = uidFromArg || authUid || uidFromStoragePath;

    if (!uid) {
      throw new Error(
        "[ImageDB] Could not resolve uid for Firestore write. " +
          "auth.currentUser.uid and image.storagePath are both unavailable.",
      );
    }

    if (
      isFirestoreDiagnosticsEnabled() &&
      authUid &&
      uidFromStoragePath &&
      authUid !== uidFromStoragePath
    ) {
      console.warn("[ImageDB] auth uid and storagePath uid mismatch", {
        authUid,
        storagePathUid: uidFromStoragePath,
        storagePath: image.storagePath ?? null,
        imageId: image.id,
      });
    }

    const pathSegments = imageDocPathSegments(uid, image.id);
    return {
      uid,
      path: pathSegments.join("/"),
      pathSegments,
    };
  }

  /**
   * Firestore への保存（必ずバリデーション経由）
   */
  async saveToFirestore(image: UploadedImage): Promise<void> {
    // 保存前に必ず厳格なバリデーション
    strictValidateBeforeSave(image);
    const target = this.resolveFirestoreTarget(image);

    try {
      await setDoc(doc(firestoreDb, ...target.pathSegments), image);
      if (isFirestoreDiagnosticsEnabled()) {
        console.log("[ImageDB] Saved to Firestore", {
          imageId: image.id,
          operation: "setDoc",
          path: target.path,
          uid: target.uid,
        });
      }
    } catch (error) {
      if (isFirestoreDiagnosticsEnabled()) {
        console.error("[ImageDB] Failed to save to Firestore", {
          imageId: image.id,
          operation: "setDoc",
          path: target.path,
          uid: target.uid,
          storagePath: image.storagePath ?? null,
          error,
        });
      } else {
        console.error("[ImageDB] Failed to save to Firestore", {
          imageId: image.id,
          operation: "setDoc",
          error,
        });
      }
      throw error;
    }

    // 本番環境でも異常検知（念のため二重チェック）
    if (import.meta.env.PROD) {
      if (
        image.remoteUrl?.includes("base64") ||
        image.localUrl?.includes("base64")
      ) {
        // Sentry に即座に報告 -> 未導入のためコンソール出力に変更
        console.error("[CRITICAL] Base64 detected in production", { image });
      }
    }
  }

  /**
   * IndexedDB への保存（必ずバリデーション経由）
   */
  async saveToIndexedDB(image: UploadedImage): Promise<void> {
    // 保存前に必ず厳格なバリデーション
    strictValidateBeforeSave(image);

    try {
      const db = await getLocalDb();
      await db.images.put(image);
      console.log(`[ImageDB] Saved to IndexedDB: ${image.id}`);
    } catch (error) {
      console.error("[ImageDB] Failed to save to IndexedDB", error);
      throw error;
    }
  }

  /**
   * バッチ処理（複数画像の一括保存）
   */
  async saveBatch(images: UploadedImage[]): Promise<void> {
    // バッチ処理でも個別にバリデーション
    for (const image of images) {
      strictValidateBeforeSave(image);
    }

    try {
      const batch = writeBatch(firestoreDb);
      const targets: Array<{ imageId: string; path: string; uid: string }> = [];
      images.forEach((image) => {
        const target = this.resolveFirestoreTarget(image);
        const ref = doc(firestoreDb, ...target.pathSegments);
        batch.set(ref, image);
        targets.push({ imageId: image.id, path: target.path, uid: target.uid });
      });
      await batch.commit();
      if (isFirestoreDiagnosticsEnabled()) {
        console.log("[ImageDB] Batch saved images to Firestore", {
          count: images.length,
          operation: "batch.set",
          targets,
        });
      }
    } catch (error) {
      const payload = {
        operation: "batch.set",
        imageIds: images.map((image) => image.id),
        error,
      };
      if (isFirestoreDiagnosticsEnabled()) {
        console.error("[ImageDB] Failed to batch save to Firestore", payload);
      } else {
        console.error("[ImageDB] Failed to batch save to Firestore", {
          operation: payload.operation,
          imageCount: images.length,
          error,
        });
      }
      throw error;
    }
  }

  /**
   * Firestore から画像を取得
   */
  async getFromFirestore(
    imageId: string,
    userId?: string,
  ): Promise<UploadedImage | null> {
    const uid = userId?.trim() || auth.currentUser?.uid?.trim() || null;
    if (!uid) {
      throw new Error(
        "[ImageDB] getFromFirestore requires authenticated userId",
      );
    }

    const target = imageDocPathSegments(uid, imageId);
    try {
      const snapshot = await getDoc(doc(firestoreDb, ...target));
      if (!snapshot.exists()) {
        // 互換: 旧グローバルコレクション images/{id}
        const legacySnapshot = await getDoc(
          doc(firestoreDb, "images", imageId),
        );
        if (!legacySnapshot.exists()) return null;
        const legacyData = legacySnapshot.data() as UploadedImage;

        // Touch migration: legacy hit 時のみ新パスへ best-effort コピー（非同期、非ブロッキング）
        if (isFirestoreDiagnosticsEnabled()) {
          console.info("[ImageDB] Legacy image hit detected", {
            imageId,
            operation: "touch-migration-hit",
            legacyPath: `images/${imageId}`,
            targetPath: target.join("/"),
            uid,
          });
        }
        const migrationKey = `${uid}:${imageId}`;
        if (!this.inFlightTouchMigrations.has(migrationKey)) {
          this.inFlightTouchMigrations.add(migrationKey);
          void setDoc(doc(firestoreDb, ...target), legacyData, { merge: false })
            .then(() => {
              if (!isFirestoreDiagnosticsEnabled()) return;
              console.info(
                "[ImageDB] Touch migration copied legacy image to user scope",
                {
                  imageId,
                  operation: "touch-migration-copy-success",
                  from: `images/${imageId}`,
                  to: target.join("/"),
                  uid,
                },
              );
            })
            .catch((copyError) => {
              if (!isFirestoreDiagnosticsEnabled()) return;
              console.warn(
                "[ImageDB] Touch migration copy failed (best-effort)",
                {
                  imageId,
                  operation: "touch-migration-copy-failed",
                  from: `images/${imageId}`,
                  to: target.join("/"),
                  uid,
                  error: copyError,
                },
              );
            })
            .finally(() => {
              this.inFlightTouchMigrations.delete(migrationKey);
            });
        } else if (isFirestoreDiagnosticsEnabled()) {
          console.info(
            "[ImageDB] Touch migration already in-flight; skipping duplicate copy",
            {
              imageId,
              operation: "touch-migration-skip-duplicate",
              uid,
            },
          );
        }

        return legacyData;
      }
      return snapshot.data() as UploadedImage;
    } catch (error) {
      if (isFirestoreDiagnosticsEnabled()) {
        console.error("[ImageDB] Failed to get from Firestore", {
          imageId,
          operation: "getDoc",
          path: target.join("/"),
          uid,
          error,
        });
      } else {
        console.error("[ImageDB] Failed to get from Firestore", {
          imageId,
          operation: "getDoc",
          error,
        });
      }
      throw error;
    }
  }

  /**
   * IndexedDB から画像を取得
   */
  async getFromIndexedDB(imageId: string): Promise<UploadedImage | null> {
    try {
      const db = await getLocalDb();
      const image = await db.images.get(imageId);
      return image || null;
    } catch (error) {
      console.error("[ImageDB] Failed to get from IndexedDB", error);
      throw error;
    }
  }
}

/**
 * 画像DB操作の統一インスタンス
 * すべての画像DB保存はこのインスタンスを経由する
 */
export const imageDB = new ImageDatabaseWriter();



