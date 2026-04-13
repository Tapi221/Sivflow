import { strictValidateBeforeSave } from "@/utils/imageValidation";
import type { UploadedImage } from "@/types";
import { auth, firestoreDb } from "@/services/firebase";
import { getLocalDb } from "@/services/localDB";
import {
  isImageFirestoreDiagnosticsEnabled as isFirestoreDiagnosticsEnabled,
  resolveImageFirestoreTarget,
  saveImageBatchToFirestore,
  saveImageToFirestore,
  type FirestoreTarget,
} from "@/infrastructure/images/imageFirestoreWriter";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { imageDocPathSegments } from "@/services/firestorePaths";

const requireFirestoreDb = () => {
  if (!firestoreDb) {
    throw new Error("[ImageDB] Firestore is unavailable");
  }

  return firestoreDb;
};

const createImageDocRef = (pathSegments: string[]) =>
  doc(
    requireFirestoreDb(),
    pathSegments[0] ?? "",
    pathSegments[1] ?? "",
    pathSegments[2] ?? "",
    pathSegments[3] ?? "",
  );

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
    return resolveImageFirestoreTarget(image, explicitUid);
  }

  /**
   * Firestore への保存（必ずバリデーション経由）
   */
  async saveToFirestore(image: UploadedImage): Promise<void> {
    await saveImageToFirestore(image);
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
    await saveImageBatchToFirestore(images);
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
      const snapshot = await getDoc(createImageDocRef(target));
      if (!snapshot.exists()) {
        // 互換: 旧グローバルコレクション images/{id}
        const legacySnapshot = await getDoc(
          doc(requireFirestoreDb(), "images", imageId),
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
          void setDoc(createImageDocRef(target), legacyData, { merge: false })
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
      return (image as UploadedImage | null) ?? null;
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
