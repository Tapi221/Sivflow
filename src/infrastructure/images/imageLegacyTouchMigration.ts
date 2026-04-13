import type { UploadedImage } from "@/types";
import type { Firestore } from "firebase/firestore";
import { setDoc } from "firebase/firestore";

import {
  createImageDocRef,
  isImageFirestoreDiagnosticsEnabled,
} from "./imageFirestoreWriter";

export const touchMigrateLegacyImageToUserScope = async ({
  db,
  imageId,
  uid,
  targetPathSegments,
  legacyData,
  inFlightTouchMigrations,
}: {
  db: Firestore;
  imageId: string;
  uid: string;
  targetPathSegments: string[];
  legacyData: UploadedImage;
  inFlightTouchMigrations: Set<string>;
}): Promise<void> => {
  if (isImageFirestoreDiagnosticsEnabled()) {
    console.info("[ImageDB] Legacy image hit detected", {
      imageId,
      operation: "touch-migration-hit",
      legacyPath: `images/${imageId}`,
      targetPath: targetPathSegments.join("/"),
      uid,
    });
  }

  const migrationKey = `${uid}:${imageId}`;
  if (inFlightTouchMigrations.has(migrationKey)) {
    if (isImageFirestoreDiagnosticsEnabled()) {
      console.info(
        "[ImageDB] Touch migration already in-flight; skipping duplicate copy",
        {
          imageId,
          operation: "touch-migration-skip-duplicate",
          uid,
        },
      );
    }
    return;
  }

  inFlightTouchMigrations.add(migrationKey);

  void setDoc(createImageDocRef(db, targetPathSegments), legacyData, {
    merge: false,
  })
    .then(() => {
      if (!isImageFirestoreDiagnosticsEnabled()) return;

      console.info(
        "[ImageDB] Touch migration copied legacy image to user scope",
        {
          imageId,
          operation: "touch-migration-copy-success",
          from: `images/${imageId}`,
          to: targetPathSegments.join("/"),
          uid,
        },
      );
    })
    .catch((copyError) => {
      if (!isImageFirestoreDiagnosticsEnabled()) return;

      console.warn("[ImageDB] Touch migration copy failed (best-effort)", {
        imageId,
        operation: "touch-migration-copy-failed",
        from: `images/${imageId}`,
        to: targetPathSegments.join("/"),
        uid,
        error: copyError,
      });
    })
    .finally(() => {
      inFlightTouchMigrations.delete(migrationKey);
    });
};
