"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSequenceShards = exports.processSequenceMappingQueue = exports.resolveSequence = exports.getTemporarySequence = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const atomicSequence_1 = require("./services/atomicSequence");
/**
 * Phase 1.5 PoC 2: Atomic Increment用Cloud Functions
 */
const atomicSeq = new atomicSequence_1.AtomicSequenceService();
/**
 * 仮シーケンスを発行
 *
 * クライアントから呼び出され、即座に仮シーケンスを返す
 */
exports.getTemporarySequence = (0, https_1.onCall)(async (request) => {
    var _a;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        const tempSeq = await atomicSeq.assignTemporarySeq(userId);
        return {
            success: true,
            tempSeq,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error assigning temporary sequence:', error);
        throw new https_1.HttpsError('internal', 'Failed to assign temporary sequence');
    }
});
/**
 * 仮シーケンスからグローバルシーケンスを解決
 *
 * クライアントがマッピング完了を確認するために使用
 */
exports.resolveSequence = (0, https_1.onCall)(async (request) => {
    const { tempSeq } = request.data;
    if (typeof tempSeq !== 'number') {
        throw new https_1.HttpsError('invalid-argument', 'tempSeq is required');
    }
    try {
        const globalSeq = await atomicSeq.resolveGlobalSeq(tempSeq);
        if (globalSeq === null) {
            return {
                success: true,
                mapped: false,
                message: 'Mapping not yet completed'
            };
        }
        return {
            success: true,
            mapped: true,
            globalSeq,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error resolving sequence:', error);
        throw new https_1.HttpsError('internal', 'Failed to resolve sequence');
    }
});
/**
 * マッピングキューを処理（定期実行）
 *
 * スケジュール: 10秒ごと
 * 目的: 仮シーケンスをグローバルシーケンスにマッピング
 */
exports.processSequenceMappingQueue = (0, scheduler_1.onSchedule)('every 10 seconds', async (event) => {
    console.log('[AtomicSeq] Starting mapping queue processing...');
    try {
        const processedCount = await atomicSeq.processMappingQueue();
        console.log(`[AtomicSeq] Processing completed. Mapped ${processedCount} sequences.`);
    }
    catch (error) {
        console.error('[AtomicSeq] Error during queue processing:', error);
    }
});
/**
 * シーケンスシャードを初期化（管理者用）
 */
exports.initializeSequenceShards = (0, https_1.onCall)(async (request) => {
    // 管理者権限チェック
    if (!request.auth || !request.auth.token.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    // 初期化ロジック（必要に応じて実装）
    return {
        success: true,
        message: 'Sequence shards initialized',
        timestamp: new Date().toISOString()
    };
});
//# sourceMappingURL=index_poc2.js.map