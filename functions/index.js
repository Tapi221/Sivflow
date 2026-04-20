/**
 * Flash Master Cloud Functions
 */

const functions = require("firebase-functions");
const { setGlobalOptions } = functions;
const {
  onCall,
  HttpsError,
  onRequest,
} = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  onObjectDeleted,
  onObjectFinalized,
} = require("firebase-functions/v2/storage");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const storageBucket = admin.storage().bucket();

setGlobalOptions({ maxInstances: 10 });

const DEFAULT_CLOUD_STORAGE_QUOTA_BYTES = 500 * 1024 * 1024;
const STORAGE_STATS_SCHEMA_VERSION = 1;
const STORAGE_STATS_DOC_ID = "current";
const ASSET_STORAGE_OBJECT_RE = /^users\/([^/]+)\/assets\/[^/]+$/;
const LEGACY_IMAGE_STORAGE_OBJECT_RE = /^users\/([^/]+)\/images\/[^/]+_(full|thumb)$/i;

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const toNonNegativeNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  return 0;
};

const getStorageStatsRef = (userId) =>
  db.doc(`users/${userId}/storageStats/${STORAGE_STATS_DOC_ID}`);

const buildStorageStatsPayload = ({
  userId,
  totalStorageUsedBytes,
  syncedImageCount,
  includeCreatedAt = false,
  includeLastRebuiltAt = false,
}) => {
  const payload = {
    userId,
    quotaBytes: DEFAULT_CLOUD_STORAGE_QUOTA_BYTES,
    totalStorageUsedBytes: Math.max(0, totalStorageUsedBytes),
    syncedImageCount: Math.max(0, syncedImageCount),
    schemaVersion: STORAGE_STATS_SCHEMA_VERSION,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (includeCreatedAt) {
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }

  if (includeLastRebuiltAt) {
    payload.lastRebuiltAt = admin.firestore.FieldValue.serverTimestamp();
  }

  return payload;
};

const readStorageStatsNumber = (data, key) => {
  if (!data || typeof data !== "object") {
    return 0;
  }

  return toNonNegativeNumber(data[key]);
};

const extractTrackedStorageObjectInfo = (objectName) => {
  if (!isNonEmptyString(objectName)) {
    return null;
  }

  const trimmedName = objectName.trim();

  const assetMatch = ASSET_STORAGE_OBJECT_RE.exec(trimmedName);
  if (assetMatch) {
    return {
      userId: assetMatch[1],
      countsTowardImageTotal: true,
    };
  }

  const legacyMatch = LEGACY_IMAGE_STORAGE_OBJECT_RE.exec(trimmedName);
  if (!legacyMatch) {
    return null;
  }

  return {
    userId: legacyMatch[1],
    countsTowardImageTotal: legacyMatch[2]?.toLowerCase() === "full",
  };
};

const updateStorageStatsByDelta = async ({
  userId,
  deltaBytes,
  deltaImageCount,
}) => {
  if (deltaBytes === 0 && deltaImageCount === 0) {
    return;
  }

  const storageStatsRef = getStorageStatsRef(userId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(storageStatsRef);
    const currentData = snapshot.exists ? snapshot.data() : null;
    const nextTotalStorageUsedBytes = Math.max(
      0,
      readStorageStatsNumber(currentData, "totalStorageUsedBytes") + deltaBytes,
    );
    const nextSyncedImageCount = Math.max(
      0,
      readStorageStatsNumber(currentData, "syncedImageCount") + deltaImageCount,
    );

    transaction.set(
      storageStatsRef,
      buildStorageStatsPayload({
        userId,
        totalStorageUsedBytes: nextTotalStorageUsedBytes,
        syncedImageCount: nextSyncedImageCount,
        includeCreatedAt: !snapshot.exists,
      }),
      { merge: true },
    );
  });
};

const collectTrackedImageStorageUsageForUser = async (userId) => {
  const [assetFiles, legacyImageFiles] = await Promise.all([
    storageBucket.getFiles({ prefix: `users/${userId}/assets/` }),
    storageBucket.getFiles({ prefix: `users/${userId}/images/` }),
  ]);

  let totalStorageUsedBytes = 0;
  let syncedImageCount = 0;

  [...assetFiles[0], ...legacyImageFiles[0]].forEach((file) => {
    const trackedInfo = extractTrackedStorageObjectInfo(file.name);
    if (!trackedInfo || trackedInfo.userId !== userId) {
      return;
    }

    totalStorageUsedBytes += toNonNegativeNumber(file.metadata?.size);
    syncedImageCount += trackedInfo.countsTowardImageTotal ? 1 : 0;
  });

  return {
    totalStorageUsedBytes,
    syncedImageCount,
  };
};

const rebuildStorageStatsForUser = async (userId) => {
  const usage = await collectTrackedImageStorageUsageForUser(userId);
  const storageStatsRef = getStorageStatsRef(userId);
  const snapshot = await storageStatsRef.get();

  await storageStatsRef.set(
    buildStorageStatsPayload({
      userId,
      totalStorageUsedBytes: usage.totalStorageUsedBytes,
      syncedImageCount: usage.syncedImageCount,
      includeCreatedAt: !snapshot.exists,
      includeLastRebuiltAt: true,
    }),
    { merge: true },
  );

  return usage;
};

/**
 * 統計更新 API
 * 学習完了時にクライアントから呼び出される
 */
exports.updateStats = onCall({ region: "asia-northeast1" }, async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "認証が必要です");
  }

  const userId = auth.uid;
  const { date, correctCount, incorrectCount, skippedCount } = data;

  if (!date) {
    throw new HttpsError("invalid-argument", "日付が必要です");
  }

  const statsRef = db.collection("userStats").doc(userId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  try {
    await db.runTransaction(async (transaction) => {
      const statsDoc = await transaction.get(statsRef);

      const totalStudy = correctCount + incorrectCount + skippedCount;

      if (statsDoc.exists) {
        const currentData = statsDoc.data();
        const newTotalCorrect =
          (currentData.totalCorrectCount || 0) + correctCount;
        const newTotalIncorrect =
          (currentData.totalIncorrectCount || 0) + incorrectCount;
        const newAccuracy =
          newTotalCorrect + newTotalIncorrect > 0
            ? (newTotalCorrect / (newTotalCorrect + newTotalIncorrect)) * 100
            : 0;

        transaction.update(statsRef, {
          totalStudyCount: admin.firestore.FieldValue.increment(totalStudy),
          todayStudyCount: admin.firestore.FieldValue.increment(totalStudy),
          weeklyStudyCount: admin.firestore.FieldValue.increment(totalStudy),
          totalCorrectCount: admin.firestore.FieldValue.increment(correctCount),
          totalIncorrectCount:
            admin.firestore.FieldValue.increment(incorrectCount),
          accuracyRate: newAccuracy,
          lastStudyAt: now,
          updatedAt: now,
        });
      } else {
        const accuracy =
          correctCount + incorrectCount > 0
            ? (correctCount / (correctCount + incorrectCount)) * 100
            : 0;

        transaction.set(statsRef, {
          userId,
          totalStudyCount: totalStudy,
          todayStudyCount: totalStudy,
          weeklyStudyCount: totalStudy,
          totalCorrectCount: correctCount,
          totalIncorrectCount: incorrectCount,
          accuracyRate: accuracy,
          lastStudyAt: now,
          updatedAt: now,
        });
      }
    });

    // 日次統計を保存
    const dailyStatsRef = db.collection("dailyStats").doc(`${userId}_${date}`);
    await dailyStatsRef.set(
      {
        userId,
        date,
        studyCount: correctCount + incorrectCount + skippedCount,
        correctCount,
        incorrectCount,
        skippedCount,
        createdAt: now,
      },
      { merge: true },
    );

    logger.info("Stats updated", {
      userId,
      date,
      correctCount,
      incorrectCount,
    });

    return { success: true, updatedAt: new Date() };
  } catch (error) {
    logger.error("Stats update error", error);
    throw new HttpsError("internal", "統計更新に失敗しました");
  }
});

/**
 * ログイン記録 API
 */
exports.recordLogin = onCall({ region: "asia-northeast1" }, async (request) => {
  const { auth } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "認証が必要です");
  }

  const userId = auth.uid;
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  try {
    const loginHistoryRef = db.collection("loginHistory");
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

    // 昨日のログイン記録を確認
    const yesterdayQuery = await loginHistoryRef
      .where("userId", "==", userId)
      .where("loginDate", "==", yesterdayStr)
      .limit(1)
      .get();

    let consecutiveDays = 1;
    let isConsecutive = false;

    if (!yesterdayQuery.empty) {
      const yesterdayData = yesterdayQuery.docs[0].data();
      consecutiveDays = (yesterdayData.consecutiveDays || 0) + 1;
      isConsecutive = true;
    }

    // 今日のログインを記録
    const todayQuery = await loginHistoryRef
      .where("userId", "==", userId)
      .where("loginDate", "==", todayStr)
      .limit(1)
      .get();

    if (todayQuery.empty) {
      await loginHistoryRef.add({
        userId,
        loginDate: todayStr,
        isConsecutive,
        consecutiveDays,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    logger.info("Login recorded", { userId, todayStr, consecutiveDays });

    return { success: true, consecutiveDays };
  } catch (error) {
    logger.error("Login record error", error);
    throw new HttpsError("internal", "ログイン記録に失敗しました");
  }
});

/**
 * クラウドストレージ使用量の再集計
 */
exports.rebuildStorageStats = onCall(
  { region: "asia-northeast1" },
  async (request) => {
    const { auth } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "認証が必要です");
    }

    const userId = auth.uid;

    try {
      const usage = await rebuildStorageStatsForUser(userId);

      logger.info("Storage stats rebuilt", {
        userId,
        totalStorageUsedBytes: usage.totalStorageUsedBytes,
        syncedImageCount: usage.syncedImageCount,
      });

      return {
        userId,
        quotaBytes: DEFAULT_CLOUD_STORAGE_QUOTA_BYTES,
        totalStorageUsedBytes: usage.totalStorageUsedBytes,
        syncedImageCount: usage.syncedImageCount,
        schemaVersion: STORAGE_STATS_SCHEMA_VERSION,
      };
    } catch (error) {
      logger.error("Storage stats rebuild error", { userId, error });
      throw new HttpsError(
        "internal",
        "クラウドストレージ使用量の再集計に失敗しました",
      );
    }
  },
);

/**
 * 画像アセット保存時にストレージ使用量を加算
 */
exports.onTrackedImageObjectFinalized = onObjectFinalized(
  { region: "asia-northeast1" },
  async (event) => {
    const objectName = event.data.name ?? "";
    const trackedInfo = extractTrackedStorageObjectInfo(objectName);

    if (!trackedInfo) {
      return;
    }

    const sizeBytes = toNonNegativeNumber(event.data.size);
    if (sizeBytes <= 0) {
      logger.warn("Tracked image finalize event missing size. Rebuilding stats.", {
        objectName,
        userId: trackedInfo.userId,
      });
      await rebuildStorageStatsForUser(trackedInfo.userId);
      return;
    }

    await updateStorageStatsByDelta({
      userId: trackedInfo.userId,
      deltaBytes: sizeBytes,
      deltaImageCount: trackedInfo.countsTowardImageTotal ? 1 : 0,
    });

    logger.info("Tracked image object finalized", {
      objectName,
      userId: trackedInfo.userId,
      sizeBytes,
      countsTowardImageTotal: trackedInfo.countsTowardImageTotal,
    });
  },
);

/**
 * 画像アセット削除時にストレージ使用量を減算
 */
exports.onTrackedImageObjectDeleted = onObjectDeleted(
  { region: "asia-northeast1" },
  async (event) => {
    const objectName = event.data.name ?? "";
    const trackedInfo = extractTrackedStorageObjectInfo(objectName);

    if (!trackedInfo) {
      return;
    }

    const sizeBytes = toNonNegativeNumber(event.data.size);
    if (sizeBytes <= 0) {
      logger.warn("Tracked image delete event missing size. Rebuilding stats.", {
        objectName,
        userId: trackedInfo.userId,
      });
      await rebuildStorageStatsForUser(trackedInfo.userId);
      return;
    }

    await updateStorageStatsByDelta({
      userId: trackedInfo.userId,
      deltaBytes: -sizeBytes,
      deltaImageCount: trackedInfo.countsTowardImageTotal ? -1 : 0,
    });

    logger.info("Tracked image object deleted", {
      objectName,
      userId: trackedInfo.userId,
      sizeBytes,
      countsTowardImageTotal: trackedInfo.countsTowardImageTotal,
    });
  },
);

/**
 * 学習ログ作成時に統計を自動更新
 */
exports.onStudyLogCreated = onDocumentCreated(
  "studyLogs/{logId}",
  async (event) => {
    const logData = event.data.data();
    const { userId, result } = logData;

    if (!userId) return;

    const statsRef = db.collection("userStats").doc(userId);
    const now = admin.firestore.FieldValue.serverTimestamp();

    try {
      await db.runTransaction(async (transaction) => {
        const statsDoc = await transaction.get(statsRef);

        const isCorrect = result === "correct" ? 1 : 0;
        const isIncorrect = result === "incorrect" ? 1 : 0;

        if (statsDoc.exists) {
          const currentData = statsDoc.data();
          const newTotalCorrect =
            (currentData.totalCorrectCount || 0) + isCorrect;
          const newTotalIncorrect =
            (currentData.totalIncorrectCount || 0) + isIncorrect;
          const newAccuracy =
            newTotalCorrect + newTotalIncorrect > 0
              ? (newTotalCorrect / (newTotalCorrect + newTotalIncorrect)) * 100
              : 0;

          transaction.update(statsRef, {
            totalStudyCount: admin.firestore.FieldValue.increment(1),
            totalCorrectCount: admin.firestore.FieldValue.increment(isCorrect),
            totalIncorrectCount:
              admin.firestore.FieldValue.increment(isIncorrect),
            accuracyRate: newAccuracy,
            lastStudyAt: now,
            updatedAt: now,
          });
        } else {
          const accuracy =
            isCorrect + isIncorrect > 0
              ? (isCorrect / (isCorrect + isIncorrect)) * 100
              : 0;

          transaction.set(statsRef, {
            userId,
            totalStudyCount: 1,
            todayStudyCount: 1,
            weeklyStudyCount: 1,
            totalCorrectCount: isCorrect,
            totalIncorrectCount: isIncorrect,
            accuracyRate: accuracy,
            lastStudyAt: now,
            updatedAt: now,
          });
        }
      });

      logger.info("Stats updated from study log", { userId, result });
    } catch (error) {
      logger.error("Stats auto-update error", error);
    }
  },
);

/**
 * ごみ箱の自動削除（30日経過したアイテムを削除）
 * 毎日午前3時（JST）に実行
 */
exports.cleanupTrash = onSchedule(
  {
    schedule: "0 18 * * *", // UTC 18:00 = JST 03:00
    timeZone: "Asia/Tokyo",
  },
  async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const deletedItemsRef = db.collection("deletedItems");
      const expiredItems = await deletedItemsRef
        .where(
          "deletedAt",
          "<",
          admin.firestore.Timestamp.fromDate(thirtyDaysAgo),
        )
        .get();

      if (expiredItems.empty) {
        logger.info("No expired items to delete");
        return;
      }

      const batch = db.batch();
      let count = 0;

      expiredItems.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });

      await batch.commit();

      logger.info(`Cleaned up ${count} expired trash items`);
    } catch (error) {
      logger.error("Trash cleanup error", error);
    }
  },
);

/**
 * 日次統計リセット（todayStudyCountをリセット）
 * 毎日午前0時（JST）に実行
 */
exports.resetDailyStats = onSchedule(
  {
    schedule: "0 15 * * *", // UTC 15:00 = JST 00:00
    timeZone: "Asia/Tokyo",
  },
  async () => {
    try {
      const userStatsRef = db.collection("userStats");
      const allStats = await userStatsRef.get();

      if (allStats.empty) {
        logger.info("No user stats to reset");
        return;
      }

      const batch = db.batch();
      let count = 0;

      allStats.docs.forEach((doc) => {
        batch.update(doc.ref, { todayStudyCount: 0 });
        count++;
      });

      await batch.commit();

      logger.info(`Reset daily stats for ${count} users`);
    } catch (error) {
      logger.error("Daily stats reset error", error);
    }
  },
);

/**
 * 週次統計リセット（weeklyStudyCountをリセット）
 * 毎週月曜日午前0時（JST）に実行
 */
exports.resetWeeklyStats = onSchedule(
  {
    schedule: "0 15 * * 1", // UTC 15:00 Monday = JST 00:00 Monday
    timeZone: "Asia/Tokyo",
  },
  async () => {
    try {
      const userStatsRef = db.collection("userStats");
      const allStats = await userStatsRef.get();

      if (allStats.empty) {
        logger.info("No user stats to reset");
        return;
      }

      const batch = db.batch();
      let count = 0;

      allStats.docs.forEach((doc) => {
        batch.update(doc.ref, { weeklyStudyCount: 0 });
        count++;
      });

      await batch.commit();

      logger.info(`Reset weekly stats for ${count} users`);
    } catch (error) {
      logger.error("Weekly stats reset error", error);
    }
  },
);

/**
 * ごみ箱手動クリーンアップAPI（管理者用）
 */
exports.manualCleanupTrash = onRequest(async (req, res) => {
  // 簡易的な認証チェック（本番環境では適切な認証を実装）
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).send("Unauthorized");
    return;
  }

  const daysThreshold = parseInt(req.query.days) || 30;
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

  try {
    const deletedItemsRef = db.collection("deletedItems");
    const expiredItems = await deletedItemsRef
      .where(
        "deletedAt",
        "<",
        admin.firestore.Timestamp.fromDate(thresholdDate),
      )
      .get();

    if (expiredItems.empty) {
      res.json({
        success: true,
        deletedCount: 0,
        message: "No items to delete",
      });
      return;
    }

    const batch = db.batch();
    let count = 0;

    expiredItems.docs.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    await batch.commit();

    res.json({
      success: true,
      deletedCount: count,
      message: `Deleted ${count} items`,
    });
  } catch (error) {
    logger.error("Manual cleanup error", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Stripe連携
// ============================================
// Stripeの初期化 (APIキーがない場合は後でエラーを投げるかnullにする)
const stripe = process.env.STRIPE_SECRET_KEY
  ? require("stripe")(process.env.STRIPE_SECRET_KEY)
  : null;

// サブスクリプション作成
exports.createSubscription = onCall(
  { region: "asia-northeast1" },
  async (request) => {
    const { auth, data } = request;
    if (!auth) {
      throw new HttpsError("unauthenticated", "認証が必要です");
    }

    const { priceId } = data;
    const userId = auth.uid;

    // ユーザードキュメントを取得
    const userDoc = await db.collection("users").doc(userId).get();
    let customerId = userDoc.data()?.stripeCustomerId;

    // Stripe顧客を作成（存在しない場合）
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: auth.token.email,
        metadata: { userId },
      });
      customerId = customer.id;
      await db.collection("users").doc(userId).update({
        stripeCustomerId: customerId,
      });
    }

    // チェックアウトセッションを作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://your-domain.com/settings?success=true",
      cancel_url: "https://your-domain.com/settings?canceled=true",
      metadata: { userId },
    });

    return { sessionId: session.id };
  },
);

// プラン制限チェック
exports.checkPlanLimit = onCall(
  { region: "asia-northeast1" },
  async (request) => {
    const { auth } = request;
    if (!auth) {
      throw new HttpsError("unauthenticated", "認証が必要です");
    }

    const userId = auth.uid;
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const plan = userData?.subscriptionPlan || "free";

    // プランに応じた制限を返す
    const limits = {
      free: { maxCards: 50, maxFolders: 10, maxStorage: 100 }, // MB
      pro: { maxCards: Infinity, maxFolders: Infinity, maxStorage: 10000 }, // MB
    };

    return limits[plan] || limits.free;
  },
);

// Stripe Webhook
exports.stripeWebhook = onRequest(
  {
    region: "asia-northeast1",
    cors: true,
  },
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      // Firebase Functions v2ではrawBodyを直接取得できないため、bodyを文字列化
      const rawBody =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      logger.error("Webhook signature verification failed", err);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // イベントタイプに応じた処理
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (userId) {
          await db.collection("users").doc(userId).update({
            subscriptionPlan: "pro",
            subscriptionStatus: "active",
            stripeSubscriptionId: session.subscription,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          logger.info("Subscription activated", {
            userId,
            subscriptionId: session.subscription,
          });
        }
        break;
      case "customer.subscription.deleted":
        const subscription = event.data.object;
        const userQuery = await db
          .collection("users")
          .where("stripeSubscriptionId", "==", subscription.id)
          .limit(1)
          .get();
        if (!userQuery.empty) {
          const userId = userQuery.docs[0].id;
          await db.collection("users").doc(userId).update({
            subscriptionPlan: "free",
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          logger.info("Subscription deactivated", { userId });
        }
        break;
      case "customer.subscription.updated":
        const updatedSubscription = event.data.object;
        const updatedUserQuery = await db
          .collection("users")
          .where("stripeSubscriptionId", "==", updatedSubscription.id)
          .limit(1)
          .get();
        if (!updatedUserQuery.empty) {
          const updatedUserId = updatedUserQuery.docs[0].id;
          await db.collection("users").doc(updatedUserId).update({
            subscriptionStatus: updatedSubscription.status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          logger.info("Subscription updated", {
            userId: updatedUserId,
            status: updatedSubscription.status,
          });
        }
        break;
    }

    res.json({ received: true });
  },
);

// ============================================
// 通知スケジュール管理
// ============================================

// 毎日の通知送信
exports.sendDailyNotifications = onSchedule(
  {
    schedule: "0 9 * * *", // 毎日9時（JST）
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1",
  },
  async () => {
    const today = new Date();

    try {
      // 通知を送信すべきユーザーを取得
      const userSettingsSnapshot = await db
        .collection("userSettings")
        .where("notificationsEnabled", "==", true)
        .get();

      for (const userSettingsDoc of userSettingsSnapshot.docs) {
        const userId = userSettingsDoc.data().userId;
        if (!userId) continue;

        // 今日復習すべきカード数を取得
        const cardsSnapshot = await db
          .collection("cards")
          .where("userId", "==", userId)
          .where(
            "nextReviewDate",
            "<=",
            admin.firestore.Timestamp.fromDate(today),
          )
          .get();

        const reviewCount = cardsSnapshot.size;

        if (reviewCount > 0) {
          // 通知トークンを取得
          const tokensSnapshot = await db
            .collection("userNotificationTokens")
            .where("userId", "==", userId)
            .get();

          if (!tokensSnapshot.empty) {
            const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);

            // Firebase Cloud Messagingを使用
            const messaging = admin.messaging();
            await messaging.sendMulticast({
              tokens,
              notification: {
                title: "Flash Master",
                body: `今日は${reviewCount}枚のカードを復習しましょう！`,
              },
              webpush: {
                notification: {
                  title: "Flash Master",
                  body: `今日は${reviewCount}枚のカードを復習しましょう！`,
                  icon: "/icon-192.png",
                  badge: "/icon-192.png",
                  requireInteraction: true,
                },
                fcmOptions: {
                  link: "/",
                },
              },
            });
          }
        }
      }

      logger.info("Daily notifications sent");
    } catch (error) {
      logger.error("Daily notifications error", error);
    }
  },
);

// ============================================
// FORCE ERROR TEST
// ============================================

// "forceError" という名前の関数をエクスポート
// この関数は **テスト用**。実行すると必ずエラーを発生させる
// 目的は GCP の Error Reporting にエラーが表示されるか確認すること
exports.forceError = onCall(async () => {
  // まずコンソールにエラーログを出力
  // これにより Functions ログにはエラー内容が残る
  console.error("FORCE ERROR LOG");

  // その後、実際にエラーを投げる
  // throw new Error() により Error Reporting に赤いエラーとして表示される
  throw new Error("FORCE_ERROR_VISIBLE_IN_GCP");
});
