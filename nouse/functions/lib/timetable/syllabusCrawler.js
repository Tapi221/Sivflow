import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getAdminAuth } from "#src/firebaseAdmin.js";
import { crawlTimetableSyllabusUrlForUser, runTimetableSyllabusCatalogCrawlJob, upsertTimetableSyllabusSourceRecord, } from "#src/timetable/syllabusCrawlerService.js";
const REGION = "asia-northeast1";
const runTimetableSyllabusCatalogCrawl = onSchedule({ schedule: "every 24 hours", timeZone: "Asia/Tokyo", region: REGION, timeoutSeconds: 540, memory: "1GiB" }, async () => {
    await runTimetableSyllabusCatalogCrawlJob();
});
const requireUid = (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError("unauthenticated", "Authentication required.");
    return uid;
};
const requireAdmin = async (uid) => {
    const user = await (await getAdminAuth()).getUser(uid);
    if (user.customClaims?.admin !== true)
        throw new HttpsError("permission-denied", "Admin access is required.");
};
const upsertTimetableSyllabusSource = onCall({ region: REGION }, async (request) => {
    const uid = requireUid(request);
    await requireAdmin(uid);
    return await upsertTimetableSyllabusSourceRecord(request.data ?? {});
});
const crawlTimetableSyllabusUrl = onCall({ region: REGION, timeoutSeconds: 300, memory: "512MiB" }, async (request) => {
    const uid = requireUid(request);
    return await crawlTimetableSyllabusUrlForUser(request.data ?? {}, uid);
});
export { crawlTimetableSyllabusUrl, runTimetableSyllabusCatalogCrawl, upsertTimetableSyllabusSource };
