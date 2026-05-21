import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// admin は functions/src/index.ts で一度だけ初期化すること
const db = admin.firestore();

export const renewExpiredWatchChannels = functions
  .region("asia-northeast1")
  .pubsub.schedule("every 24 hours")
  .onRun(async () => {
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
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.error("[renew]", e);
      }
    }
  });