/**
 * Subscribes to the Firestore document record and merges updates into
 * the local docState. Returns a merged DocumentItem and a patch function.
 */

import { useCallback, useEffect, useState } from "react";
import {
  doc as firestoreDoc,
  onSnapshot,
  type DocumentSnapshot,
} from "firebase/firestore";
import { firestoreDb } from "@/services/firebase";
import { getLocalDb } from "@/services/localDB";
import { documentDocPathSegments } from "@/services/firestorePaths";
import type { DocumentItem } from "@/types";

interface Options {
  doc: DocumentItem;
  userId: string | undefined;
}

interface PptxDocumentSync {
  docState: DocumentItem;
  applyLocalDocumentPatch: (patch: Partial<DocumentItem>) => Promise<void>;
}

export function usePptxDocumentSync({
  doc,
  userId,
}: Options): PptxDocumentSync {
  const [docState, setDocState] = useState<DocumentItem>(doc);

  // Keep in sync when parent passes a new doc object (e.g., optimistic update)
  useEffect(() => {
    setDocState(doc);
  }, [doc]);

  // Persist a patch locally (IndexedDB) and apply it to React state
  const applyLocalDocumentPatch = useCallback(
    async (patch: Partial<DocumentItem>) => {
      setDocState((prev) => ({
        ...prev,
        ...patch,
        pptx: patch.pptx ? { ...prev.pptx, ...patch.pptx } : prev.pptx,
      }));

      if (!userId || !doc.id) return;
      try {
        const db = await getLocalDb(userId);
        const existing = await db.documents.get(doc.id);
        const persistedPatch: Partial<DocumentItem> = { ...patch };
        if (patch.pptx) {
          persistedPatch.pptx = { ...(existing?.pptx ?? {}), ...patch.pptx };
        }
        await db.updateItem("documents", doc.id, {
          ...persistedPatch,
          updatedAt: new Date(),
        });
      } catch (error) {
        console.warn("[usePptxDocumentSync] Failed to persist patch", {
          docId: doc.id,
          patch,
          error,
        });
      }
    },
    [userId, doc.id],
  );

  // Firestore document subscription
  useEffect(() => {
    if (!userId || !doc.id) return;
    const ref = firestoreDoc(
      firestoreDb,
      ...documentDocPathSegments(userId, doc.id),
    );
    const unsubscribe = onSnapshot(ref, (snap: DocumentSnapshot) => {
      if (!snap.exists()) return;
      const data = snap.data() as Partial<DocumentItem>;
      setDocState((prev) => ({
        ...prev,
        ...data,
        pptx: { ...prev.pptx, ...data.pptx },
      }));
    });
    return () => unsubscribe();
  }, [userId, doc.id]);

  return { docState, applyLocalDocumentPatch };
}



