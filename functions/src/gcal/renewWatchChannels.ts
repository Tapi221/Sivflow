import { onSchedule } from "firebase-functions/v2/scheduler";

let adminAppReady: Promise<void> | null = null;
let firestoreModulePromise: Promise<typeof import("firebase-admin/firestore")> | null = null;

const ensureFirebaseAdmin = async (): Promise<void> => {
  adminAppReady ??= (async () => {
    const { getApps, initializeApp } = await import("firebase-admin/app");

    if (getApps().length === 0) {
      initializeApp();
    }
  })();

  await adminAppReady;
};

const getFirestoreModule = async () => {
  firestoreModulePromise ??= import("firebase-admin/firestore");
  return await firestoreModulePromise;
};

const getDb = async () => {
  await ensureFirebaseAdmin();
  const { getFirestore } = await getFirestoreModule();
  return getFirestore();
};

const serverTimestamp = async () => {
  const { FieldValue } = await getFirestoreModule();
  return FieldValue.serverTimestamp();
};

export const renewExpiredWatchChannels = onSchedule(
  {
    region: "asia-northeast1",
    schedule: "every 24 hours",
  },
  async () => {
    const db = await getDb();
    const now = Date.now();
    const threshold = now + 24 * 60 * 60 * 1000;

    const snap = await db
      .collectionGroup("calendars")
      .where("expiration", "<", threshold)
      .get();

    if (snap.empty) return;

    for (const docSnap of snap.docs) {
      const data = docSnap.data();

      try {
        await docSnap.ref.delete();

        await db.collection("gcal_renew_queue").add({
          userId: data.userId,
          calendarId: data.calendarId,
          createdAt: await serverTimestamp(),
        });
      } catch (e) {
        console.error("[renew]", e);
      }
    }
  },
);
