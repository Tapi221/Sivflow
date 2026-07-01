import { auth, requireFirestoreDb } from "@platform/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { imageDocPathSegments } from "@/infrastructure/firebase/firestore/paths";
import type { UploadedImage } from "@/types";



type GetImageFromFirestoreOptions = {
  imageId: string;
  userId?: string;
  inFlightTouchMigrations?: Set<string>;
};



const FIRESTORE_DIAGNOSTIC_FLAG = "flashcard.firestore.diagnostics";



const isImageFirestoreDiagnosticsEnabled = (): boolean => {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(FIRESTORE_DIAGNOSTIC_FLAG) === "1";
  } catch {
    return false;
  }
};
const resolveImageReaderUserId = (userId: string | undefined): string | null => {
  const trimmedUserId = userId?.trim() ?? "";
  if (trimmedUserId.length > 0) return trimmedUserId;

  const trimmedAuthUid = auth.currentUser?.uid?.trim() ?? "";
  if (trimmedAuthUid.length > 0) return trimmedAuthUid;

  return null;
};
const getImageFromFirestore = async ({ imageId, userId, inFlightTouchMigrations: _inFlightTouchMigrations }: GetImageFromFirestoreOptions): Promise<UploadedImage | null> => {
  const uid = resolveImageReaderUserId(userId);
  if (!uid) {
    throw new Error("[ImageDB] getFromFirestore requires authenticated userId");
  }

  const db = requireFirestoreDb();
  const target = imageDocPathSegments(uid, imageId);

  try {
    const snapshot = await getDoc(doc(db, target[0] ?? "", target[1] ?? "", target[2] ?? "", target[3] ?? ""));
    if (!snapshot.exists()) {
      const legacySnapshot = await getDoc(doc(db, "images", imageId));
      if (!legacySnapshot.exists()) return null;
      return legacySnapshot.data() as UploadedImage;
    }

    return snapshot.data() as UploadedImage;
  } catch (error) {
    if (isImageFirestoreDiagnosticsEnabled()) {
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
};



export { getImageFromFirestore };
