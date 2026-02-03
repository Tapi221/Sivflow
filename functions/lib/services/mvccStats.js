"use strict";
// MVCC (Multi-Version Concurrency Control) バックグラウンド統計処理
// Lock-free読み取り + 最終チェックによる楽観的更新
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchUpdateUserStats = void 0;
const admin = require("firebase-admin");
/**
 * ユーザー統計のバッチ集計（定期実行）
 * @param userIds - 対象ユーザーIDリスト（省略時は全ユーザー）
 * @returns 処理結果（成功数、スキップ数、失敗数）
 */
async function batchUpdateUserStats(userIds) {
    const db = admin.firestore();
    const snapshotTime = admin.firestore.Timestamp.now();
    let success = 0;
    let skipped = 0;
    let failed = 0;
    // 対象ユーザーの取得
    let targetUsers = [];
    if (userIds && userIds.length > 0) {
        targetUsers = userIds;
    }
    else {
        // 全ユーザーを取得（実際には最近アクティブなユーザーのみなど条件を追加すべき）
        const usersSnapshot = await db.collection('users').limit(1000).get();
        targetUsers = usersSnapshot.docs.map(doc => doc.id);
    }
    // 各ユーザーの統計を並列処理
    const results = await Promise.allSettled(targetUsers.map(userId => updateSingleUserStats(userId, snapshotTime)));
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            if (result.value.skipped) {
                skipped++;
            }
            else {
                success++;
            }
        }
        else {
            failed++;
            console.error('統計更新失敗:', result.reason);
        }
    });
    return { success, skipped, failed };
}
exports.batchUpdateUserStats = batchUpdateUserStats;
/**
 * 単一ユーザーの統計更新（MVCC方式）
 * @param userId - ユーザーID
 * @param snapshotTime - スナップショット取得時刻
 * @returns 処理結果
 */
async function updateSingleUserStats(userId, snapshotTime) {
    const db = admin.firestore();
    // 1. スナップショット読み取り（Lock不要）
    const cardsSnapshot = await db
        .collection('cards')
        .where('userId', '==', userId)
        .get();
    // 2. 集計処理（ローカル計算）
    let totalCards = 0;
    let learnedCards = 0;
    let averageRetention = 0;
    let totalRetention = 0;
    let retentionCount = 0;
    cardsSnapshot.docs.forEach(doc => {
        const card = doc.data();
        totalCards++;
        if (card.lastReviewAt) {
            learnedCards++;
            if (typeof card.retention === 'number') {
                totalRetention += card.retention;
                retentionCount++;
            }
        }
    });
    if (retentionCount > 0) {
        averageRetention = totalRetention / retentionCount;
    }
    const stats = {
        totalCards,
        learnedCards,
        averageRetention,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // 3. 最終チェック + 条件付き書き込み
    const statsRef = db.collection('userStats').doc(userId);
    try {
        await db.runTransaction(async (transaction) => {
            const currentStats = await transaction.get(statsRef);
            // 集計開始以降に更新があったかチェック
            if (currentStats.exists) {
                const data = currentStats.data();
                const lastUpdated = data === null || data === void 0 ? void 0 : data.lastCardUpdateAt;
                // snapshotTime より後に更新があった場合はスキップ
                if (lastUpdated && lastUpdated.toMillis() > snapshotTime.toMillis()) {
                    throw new SkipUpdateError(`User ${userId} has newer updates`);
                }
            }
            // 更新実行
            transaction.set(statsRef, stats, { merge: true });
        });
        return { skipped: false };
    }
    catch (error) {
        if (error instanceof SkipUpdateError) {
            console.log(`統計更新スキップ: ${error.message}`);
            return { skipped: true };
        }
        throw error;
    }
}
/**
 * カスタムエラー: 更新スキップ
 */
class SkipUpdateError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SkipUpdateError';
    }
}
//# sourceMappingURL=mvccStats.js.map