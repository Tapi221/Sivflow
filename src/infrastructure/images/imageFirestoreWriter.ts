import type { Firestore } from "firebase/firestore";
import { doc, setDoc, writeBatch } from "firebase/firestore";

import { auth, requireFirestoreDb } from "@/infrastructure/firebase/client";
import { imageDocPathSegments } from "@/infrastructure/firebase/firestore/paths";
import type { UploadedImage } from "@/types";
import { assertImageInvariant } from "@/utils/imageAssertions";

export type FirestoreTarget = {
  uid: string;
  path: string;
  pathSegments: string[];
};

const USER_STORAGE_PATH_RE = /^users\/([^/]+)\//i;
const FIRESTORE_DIAGNOSTIC_FLAG = "flashcard.firestore.diagnostics";

const extractUidFromStoragePath = (
  storagePath?: string | null,
): string | null => {
  if (typeof storagePath !== "string") return null;

  const trimmed = storagePath.trim();
  if (!trimmed) return null;

  const match = USER_STORAGE_PATH_RE.exec(trimmed);
  return match?.[1] ?? null;
};

export const isImageFirestoreDiagnosticsEnabled = (): boolean => {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(FIRESTORE_DIAGNOSTIC_FLAG) === "1";
  } catch {
    return false;
  }
};

export const createImageDocRef = (db: Firestore, pathSegments: string[]) =>
  doc(
    db,
    pathSegments[0] ?? "",
    pathSegments[1] ?? "",
    pathSegments[2] ?? "",
    pathSegments[3] ?? "",
  );

export const resolveImageFirestoreTarget = (
  image: UploadedImage,
  explicitUid?: string,
): FirestoreTarget => {
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
    isImageFirestoreDiagnosticsEnabled() &&
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
};

export const saveImageToFirestore = async (
  image: UploadedImage,
): Promise<void> => {
  assertImageInvariant(image);

  const target = resolveImageFirestoreTarget(image);
  const db = requireFirestoreDb();

  try {
    await setDoc(createImageDocRef(db, target.pathSegments), image);
    if (isImageFirestoreDiagnosticsEnabled()) {
      console.log("[ImageDB] Saved to Firestore", {
        imageId: image.id,
        operation: "setDoc",
        path: target.path,
        uid: target.uid,
      });
    }
  } catch (error) {
    if (isImageFirestoreDiagnosticsEnabled()) {
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
};

export const saveImageBatchToFirestore = async (
  images: UploadedImage[],
): Promise<void> => {
  for (const image of images) {
    assertImageInvariant(image);
  }

  try {
    const db = requireFirestoreDb();
    const batch = writeBatch(db);
    const targets: Array<{ imageId: string; path: string; uid: string }> = [];

    images.forEach((image) => {
      const target = resolveImageFirestoreTarget(image);
      const ref = createImageDocRef(db, target.pathSegments);
      batch.set(ref, image);
      targets.push({ imageId: image.id, path: target.path, uid: target.uid });
    });

    await batch.commit();

    if (isImageFirestoreDiagnosticsEnabled()) {
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

    if (isImageFirestoreDiagnosticsEnabled()) {
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
};
