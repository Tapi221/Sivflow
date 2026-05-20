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

        // 再登録はクライアント or 別workerに任せる
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