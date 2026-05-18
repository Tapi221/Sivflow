import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Google Calendar Push通知を受信するWebhook。
 *
 * Google が変更を検知すると以下のヘッダーを付けてPOSTしてくる:
 *   X-Goog-Channel-ID    : watch()登録時に自分で指定したチャンネルID
 *   X-Goog-Resource-State: "sync"（初回確認）or "exists"（変更あり）
 *   X-Goog-Channel-Token : watch()登録時に渡した token（カレンダーIDを格納）
 *   X-Goog-Resource-ID   : Google側のリソースID（チャンネル更新時に必要）
 *
 * Cloud FunctionのURLをGoogle Calendar watch APIに登録すること。
 * デプロイ後のURL例: https://asia-northeast1-<project>.cloudfunctions.net/gcalWebhook
 */
export const gcalWebhook = functions
  .region("asia-northeast1")
  .https.onRequest(async (req, res) => {
    // Google の Push通知は常にPOST
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const resourceState = req.headers["x-goog-resource-state"] as string;
    const channelId = req.headers["x-goog-channel-id"] as string;
    // token にはユーザーID + カレンダーIDを "uid:calendarId" 形式で格納
    const token = req.headers["x-goog-channel-token"] as string;

    // "sync" は watch登録直後の確認通知なので無視
    if (resourceState === "sync") {
      res.status(200).send();
      return;
    }

    if (!token || !channelId) {
      res.status(400).send("Missing required headers");
      return;
    }

    // token から userId と calendarId を分解
    const [userId, ...calendarIdParts] = token.split(":");
    const calendarId = calendarIdParts.join(":");

    if (!userId || !calendarId) {
      res.status(400).send("Invalid token format");
      return;
    }

    try {
      // Firestore の /gcal_notifications/{userId}/calendars/{calendarId} に書き込む
      // onSnapshot で購読しているクライアントが即座に変更を検知する
      await db
        .collection("gcal_notifications")
        .doc(userId)
        .collection("calendars")
        .doc(calendarId)
        .set(
          {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            resourceState,
            channelId,
          },
          { merge: true },
        );

      res.status(200).send();
    } catch (error) {
      console.error("[gcalWebhook] Firestoreへの書き込みに失敗:", error);
      res.status(500).send("Internal Server Error");
    }
  });

/**
 * watchチャンネルの有効期限が近いものを自動更新するスケジュール関数。
 * 毎日1回実行し、7日以内に期限切れになるチャンネルを更新する。
 */
export const renewExpiredWatchChannels = functions
  .region("asia-northeast1")
  .pubsub.schedule("every 24 hours")
  .onRun(async () => {
    const now = Date.now();
    const threshold = now + 7 * 24 * 60 * 60 * 1000; // 7日後

    // /gcal_watch_channels コレクション全件を確認
    const snap = await db
      .collection("gcal_watch_channels")
      .where("expiration", "<", threshold)
      .get();

    if (snap.empty) {
      console.log("[renewExpiredWatchChannels] 更新対象なし");
      return;
    }

    // 期限切れ間近なチャンネルを「要更新」フラグを立てる
    // クライアント側が次回起動時に再登録を実行する
    const batch = db.batch();
    snap.docs.forEach((doc) => {
      batch.update(doc.ref, { needsRenewal: true });
    });
    await batch.commit();

    console.log(
      `[renewExpiredWatchChannels] ${snap.size}件のチャンネルを更新対象にマーク`,
    );
  });