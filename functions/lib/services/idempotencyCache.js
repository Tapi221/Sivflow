"use strict";
// Idempotency Cache システム
// 重複除外 + 順序保証の強化版
Object.defineProperty(exports, "__esModule", { value: true });
exports.TooManyRequestsError = exports.ResyncRequiredError = exports.markIdempotencyFailed = exports.markIdempotencyComplete = exports.checkIdempotencyAndAcquireLock = void 0;
const admin = require("firebase-admin");
/**
 * Idempotencyチェックとロック取得
 * @param requestId - リクエストID（UUID）
 * @param userId - ユーザーID
 * @param clientSeq - クライアント側シーケンス番号
 * @returns 既存の結果、またはロック成功の情報
 * @throws ResyncRequiredError 順序不整合時
 * @throws TooManyRequestsError ロック競合時
 */
async function checkIdempotencyAndAcquireLock(requestId, userId, clientSeq) {
    var _a, _b, _c, _d;
    const db = admin.firestore();
    const idempotencyRef = db.collection('idempotency').doc(requestId);
    const userMetaRef = db.collection('users').doc(userId);
    // 1. requestId で検索 → 存在するなら結果返却
    const existing = await idempotencyRef.get();
    if (existing.exists) {
        const data = existing.data();
        if (data.status === 'completed') {
            return { isNew: false, existingResult: data.result };
        }
        if (data.status === 'processing') {
            // ロック競合 → Exponential Backoff でリトライ
            await waitForLockRelease(requestId, 5, 100, 2000);
            // リトライ後も processing なら 429 エラー
            const retry = await idempotencyRef.get();
            if (retry.exists && ((_a = retry.data()) === null || _a === void 0 ? void 0 : _a.status) === 'processing') {
                throw new TooManyRequestsError('Lock contention: Operation still processing');
            }
            // 完了している場合は結果返却
            if (retry.exists && ((_b = retry.data()) === null || _b === void 0 ? void 0 : _b.status) === 'completed') {
                return { isNew: false, existingResult: (_c = retry.data()) === null || _c === void 0 ? void 0 : _c.result };
            }
        }
    }
    // 2. clientSeq 順序検証
    const userMeta = await userMetaRef.get();
    const lastProcessedSeq = ((_d = userMeta.data()) === null || _d === void 0 ? void 0 : _d.lastProcessedClientSeq) || 0;
    if (clientSeq <= lastProcessedSeq) {
        // 処理済み（過去の操作） → 成功扱いで無視
        return { isNew: false, existingResult: { skipped: true, reason: 'Already processed' } };
    }
    if (clientSeq > lastProcessedSeq + 1) {
        // 順序抜け → ResyncRequired
        throw new ResyncRequiredError(`Sequence gap detected. Expected: ${lastProcessedSeq + 1}, Got: ${clientSeq}`);
    }
    // 3. ロック取得（status = 'processing'）
    const now = admin.firestore.Timestamp.now();
    const ttl = admin.firestore.Timestamp.fromMillis(now.toMillis() + 30 * 60 * 1000); // 30分
    await idempotencyRef.set({
        requestId,
        userId,
        clientSeq,
        status: 'processing',
        createdAt: now,
        ttl,
    });
    return { isNew: true };
}
exports.checkIdempotencyAndAcquireLock = checkIdempotencyAndAcquireLock;
/**
 * Idempotencyレコードを完了状態に更新
 */
async function markIdempotencyComplete(requestId, userId, clientSeq, result) {
    const db = admin.firestore();
    const idempotencyRef = db.collection('idempotency').doc(requestId);
    const userMetaRef = db.collection('users').doc(userId);
    await db.runTransaction(async (transaction) => {
        transaction.update(idempotencyRef, {
            status: 'completed',
            result,
        });
        transaction.set(userMetaRef, {
            lastProcessedClientSeq: clientSeq,
            lastProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
}
exports.markIdempotencyComplete = markIdempotencyComplete;
/**
 * Idempotencyレコードを失敗状態に更新
 */
async function markIdempotencyFailed(requestId, error) {
    const db = admin.firestore();
    await db.collection('idempotency').doc(requestId).update({
        status: 'failed',
        error,
    });
}
exports.markIdempotencyFailed = markIdempotencyFailed;
/**
 * ロック解放待ち（Exponential Backoff）
 */
async function waitForLockRelease(requestId, maxAttempts, initialMs, maxMs) {
    var _a;
    const db = admin.firestore();
    const ref = db.collection('idempotency').doc(requestId);
    for (let i = 0; i < maxAttempts; i++) {
        const waitMs = Math.min(initialMs * Math.pow(1.5, i), maxMs);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        const doc = await ref.get();
        if (!doc.exists || ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.status) !== 'processing') {
            return; // ロック解放
        }
    }
}
/**
 * カスタムエラー: 再同期が必要
 */
class ResyncRequiredError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ResyncRequiredError';
    }
}
exports.ResyncRequiredError = ResyncRequiredError;
/**
 * カスタムエラー: リクエスト過多
 */
class TooManyRequestsError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TooManyRequestsError';
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
//# sourceMappingURL=idempotencyCache.js.map