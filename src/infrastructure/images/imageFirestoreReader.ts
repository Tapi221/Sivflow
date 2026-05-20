import { doc, getDoc } from "firebase/firestore";

import {
  createImageDocRef,
  isImageFirestoreDiagnosticsEnabled,
} from "./imageFirestoreWriter";
import { touchMigrateLegacyImageToUserScope } from "./imageLegacyTouchMigration";

import { auth, requireFirestoreDb } from "@/infrastructure/firebase/client";
import { imageDocPathSegments } from "@/infrastructure/firebase/firestore/paths";
import type { UploadedImage } from "@/types";

export const getImageFromFirestore = async ({
  imageId,
  userId,
  inFlightTouchMigrations,
}: {
  imageId: string;
  userId?: string;
  inFlightTouchMigrations: Set<string>;
}): Promise<UploadedImage | null> => {
  const uid = userId?.trim() || auth.currentUser?.uid?.trim() || null;
  if (!uid) {
    throw new Error("[ImageDB] getFromFirestore requires authenticated userId");
  }

  const db = requireFirestoreDb();
  const target = imageDocPathSegments(uid, imageId);

  try {
    const snapshot = await getDoc(createImageDocRef(db, target));
    if (!snapshot.exists()) {
      const legacySnapshot = await getDoc(doc(db, "images", imageId));
      if (!legacySnapshot.exists()) return null;

      const legacyData = legacySnapshot.data() as UploadedImage;
      await touchMigrateLegacyImageToUserScope({
        db,
        imageId,
        uid,
        targetPathSegments: target,
        legacyData,
        inFlightTouchMigrations,
      });

      return legacyData;
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
