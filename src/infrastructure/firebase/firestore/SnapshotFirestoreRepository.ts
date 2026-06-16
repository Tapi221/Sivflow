import { requireFirestoreDb } from "@platform/firebase/client";
import { addDoc, collection, deleteDoc, getDocs, limit, orderBy, query } from "firebase/firestore";
import type { SnapshotRepositoryPort } from "@/application/ports/SnapshotRepositoryPort";
import type { AppSnapshot } from "@/types/domain/snapshot";



const MAX_STORED_SNAPSHOTS = 7;



const save: SnapshotRepositoryPort["save"] = async (snapshot) => {
  const userId = snapshot.metadata.userId;

  if (!userId) {
    throw new Error("userId is required for saving snapshot");
  }

  const db = requireFirestoreDb();
  const snapshotsRef = collection(db, `users/${userId}/snapshots`);

  await addDoc(snapshotsRef, {
    ...snapshot,
    createdAt: new Date(snapshot.metadata.createdAt),
  });

  const snapshotsQuery = query(
    snapshotsRef,
    orderBy("metadata.createdAt", "desc"),
    limit(100),
  );

  const querySnapshot = await getDocs(snapshotsQuery);
  const docs = querySnapshot.docs;

  if (docs.length > MAX_STORED_SNAPSHOTS) {
    const toDelete = docs.slice(MAX_STORED_SNAPSHOTS);
    await Promise.all(toDelete.map((doc) => deleteDoc(doc.ref)));
  }
};
const list: SnapshotRepositoryPort["list"] = async (userId) => {
  const db = requireFirestoreDb();
  const snapshotsRef = collection(db, `users/${userId}/snapshots`);
  const snapshotsQuery = query(
    snapshotsRef,
    orderBy("metadata.createdAt", "desc"),
  );

  const querySnapshot = await getDocs(snapshotsQuery);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      metadata: data.metadata,
      data: data.data,
    } as AppSnapshot;
  });
};



const snapshotFirestoreRepository: SnapshotRepositoryPort = { save, list };



export { snapshotFirestoreRepository };
