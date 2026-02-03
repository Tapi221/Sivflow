"use strict";
// グローバル順序保証システム
// Firestore Transaction を使用した厳密な順序付け
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignGlobalSequence = exports.calculateShardId = void 0;
const admin = require("firebase-admin");
/**
 * シャード番号を計算（ユーザーIDのハッシュ mod 10）
 */
function calculateShardId(userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = ((hash << 5) - hash) + userId.charCodeAt(i);
        hash |= 0; // 32bit整数に変換
    }
    return Math.abs(hash) % 10;
}
exports.calculateShardId = calculateShardId;
/**
 * グローバルSequenceを採番（Transaction保証）
 * @param userId - ユーザーID
 * @param maxRetries - 最大リトライ回数（デフォルト: 3回）
 * @returns 採番されたglobalSeq
 * @throws Error リトライ上限に達した場合
 */
async function assignGlobalSequence(userId, maxRetries = 3) {
    const db = admin.firestore();
    const shardId = calculateShardId(userId);
    const seqDocRef = db.doc(`system/globalSequence_shard${shardId}`);
    let retryCount = 0;
    let lastError = null;
    while (retryCount < maxRetries) {
        try {
            const result = await db.runTransaction(async (transaction) => {
                var _a;
                const seqDoc = await transaction.get(seqDocRef);
                let currentSeq = 0;
                if (seqDoc.exists) {
                    currentSeq = ((_a = seqDoc.data()) === null || _a === void 0 ? void 0 : _a.value) || 0;
                }
                const nextSeq = currentSeq + 1;
                // シャードドキュメント更新
                transaction.set(seqDocRef, {
                    value: nextSeq,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                return nextSeq;
            });
            return result;
        }
        catch (error) {
            lastError = error;
            retryCount++;
            // 指数バックオフ（100ms, 200ms, 400ms...）
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount - 1)));
            }
        }
    }
    throw new Error(`Failed to assign global sequence after ${maxRetries} retries. ` +
        `Shard: ${shardId}, Last error: ${lastError === null || lastError === void 0 ? void 0 : lastError.message}`);
}
exports.assignGlobalSequence = assignGlobalSequence;
//# sourceMappingURL=globalSequence.js.map