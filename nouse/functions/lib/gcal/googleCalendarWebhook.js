import { onRequest } from "firebase-functions/v2/https";
import { getDb, serverTimestamp } from "#src/firebaseAdmin.js";
const REGION = "asia-northeast1";
const INITIAL_SYNC_RESOURCE_STATE = "sync";
const googleCalendarWebhook = onRequest({ region: REGION, }, async (request, response) => {
    if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
    }
    const channelId = getHeader(request, "x-goog-channel-id");
    const resourceId = getHeader(request, "x-goog-resource-id");
    const resourceState = getHeader(request, "x-goog-resource-state");
    const token = parseWebhookToken(getHeader(request, "x-goog-channel-token"));
    if (!channelId || !resourceId || !resourceState || !token) {
        console.warn("[GoogleCalendarWebhook] ignored invalid webhook headers", {
            hasChannelId: Boolean(channelId),
            hasResourceId: Boolean(resourceId),
            hasResourceState: Boolean(resourceState),
            hasToken: Boolean(token),
        });
        response.status(204).send();
        return;
    }
    if (resourceState === INITIAL_SYNC_RESOURCE_STATE) {
        response.status(204).send();
        return;
    }
    const db = await getDb();
    const watchRef = db.doc(`gcal_watch_channels/${token.userId}/calendars/${token.calendarId}`);
    const watchSnap = await watchRef.get();
    if (!watchSnap.exists ||
        !isMatchingWatchChannel(watchSnap.data(), {
            channelId,
            resourceId,
            userId: token.userId,
            calendarId: token.calendarId,
        })) {
        console.warn("[GoogleCalendarWebhook] ignored unmatched watch channel", {
            userId: token.userId,
            calendarId: token.calendarId,
            channelId,
            resourceId,
        });
        response.status(204).send();
        return;
    }
    const now = await serverTimestamp();
    await db
        .doc(`gcal_notifications/${token.userId}/calendars/${token.calendarId}`)
        .set({
        userId: token.userId,
        calendarId: token.calendarId,
        resourceState,
        channelId,
        resourceId,
        receivedAt: now,
    }, { merge: true });
    response.status(204).send();
});
const getHeader = (request, name) => {
    const value = request.get(name);
    return value?.trim() || null;
};
const parseWebhookToken = (token) => {
    if (!token)
        return null;
    const separatorIndex = token.indexOf(":");
    if (separatorIndex <= 0 || separatorIndex === token.length - 1)
        return null;
    const userId = token.slice(0, separatorIndex).trim();
    const calendarId = token.slice(separatorIndex + 1).trim();
    if (!userId || !calendarId)
        return null;
    return { userId, calendarId };
};
const isMatchingWatchChannel = (data, expected) => {
    return (data?.channelId === expected.channelId &&
        data.resourceId === expected.resourceId &&
        data.userId === expected.userId &&
        data.calendarId === expected.calendarId);
};
export { googleCalendarWebhook };
