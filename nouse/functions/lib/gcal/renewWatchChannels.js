import { onSchedule } from "firebase-functions/v2/scheduler";
import { getDb, serverTimestamp } from "#src/firebaseAdmin.js";
const renewExpiredWatchChannels = onSchedule({ region: "asia-northeast1", schedule: "every 24 hours", }, async () => {
    const db = await getDb();
    const now = Date.now();
    const threshold = now + 24 * 60 * 60 * 1000;
    const snap = await db
        .collectionGroup("calendars")
        .where("expiration", "<", threshold)
        .get();
    if (snap.empty)
        return;
    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        try {
            await docSnap.ref.delete();
            await db.collection("gcal_renew_queue").add({
                userId: data.userId,
                calendarId: data.calendarId,
                createdAt: await serverTimestamp(),
            });
        }
        catch (e) {
            console.error("[renew]", e);
        }
    }
});
export { renewExpiredWatchChannels };
