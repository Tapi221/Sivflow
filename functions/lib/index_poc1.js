"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualSplitShard = exports.getAllShardMetrics = exports.getActiveShardForUser = exports.recordShardMetric = exports.monitorAndSplitShards = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const shardManager_1 = require("./services/shardManager");
/**
 * Phase 1.5 PoC 1: シャード動的拡張用Cloud Functions
 */
const shardManager = new shardManager_1.ShardManager();
/**
 * シャード負荷監視（定期実行）
 *
 * スケジュール: 1分ごと
 * 目的: 負荷閾値超過シャードを検出し、自動分割
 */
exports.monitorAndSplitShards = (0, scheduler_1.onSchedule)('every 1 minutes', async (event) => {
    console.log('[ShardMonitor] Starting shard monitoring...');
    try {
        // すべてのシャードのメトリクスを取得
        const allMetrics = await shardManager.getAllShardMetrics();
        let splitCount = 0;
        // 各シャードをチェック
        for (const [shardId, metrics] of allMetrics.entries()) {
            const shouldSplit = await shardManager.shouldSplitShard(shardId);
            if (shouldSplit) {
                console.log(`[ShardMonitor] Splitting shard ${shardId}...`);
                try {
                    await shardManager.splitShard(shardId);
                    splitCount++;
                }
                catch (error) {
                    console.error(`[ShardMonitor] Failed to split shard ${shardId}:`, error);
                }
            }
        }
        console.log(`[ShardMonitor] Monitoring completed. Split ${splitCount} shards.`);
    }
    catch (error) {
        console.error('[ShardMonitor] Error during monitoring:', error);
    }
});
/**
 * シャード負荷メトリクスを記録
 *
 * クライアントから操作完了時に呼び出される
 */
exports.recordShardMetric = (0, https_1.onCall)(async (request) => {
    const { shardId, latency, success } = request.data;
    if (!shardId || typeof latency !== 'number' || typeof success !== 'boolean') {
        throw new https_1.HttpsError('invalid-argument', 'Invalid parameters');
    }
    try {
        await shardManager.recordMetric(shardId, latency, success);
        return {
            success: true,
            message: 'Metric recorded successfully'
        };
    }
    catch (error) {
        console.error('Error recording metric:', error);
        throw new https_1.HttpsError('internal', 'Failed to record metric');
    }
});
/**
 * ユーザーの適切なシャードIDを取得
 *
 * 動的分割に対応したシャードルーティング
 */
exports.getActiveShardForUser = (0, https_1.onCall)(async (request) => {
    const { userId } = request.data;
    if (!userId) {
        throw new https_1.HttpsError('invalid-argument', 'userId is required');
    }
    try {
        const shardId = await shardManager.getActiveShardForUser(userId);
        return {
            success: true,
            shardId,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error getting active shard:', error);
        throw new https_1.HttpsError('internal', 'Failed to get active shard');
    }
});
/**
 * すべてのシャードの負荷状況を取得（管理者用）
 */
exports.getAllShardMetrics = (0, https_1.onCall)(async (request) => {
    // 管理者権限チェック（本番環境では必須）
    if (!request.auth || !request.auth.token.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        const metrics = await shardManager.getAllShardMetrics();
        // Map → Object変換
        const metricsObj = {};
        metrics.forEach((value, key) => {
            metricsObj[key] = value;
        });
        return {
            success: true,
            metrics: metricsObj,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error getting shard metrics:', error);
        throw new https_1.HttpsError('internal', 'Failed to get shard metrics');
    }
});
/**
 * 手動でシャードを分割（管理者用）
 */
exports.manualSplitShard = (0, https_1.onCall)(async (request) => {
    // 管理者権限チェック
    if (!request.auth || !request.auth.token.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    const { shardId } = request.data;
    if (!shardId) {
        throw new https_1.HttpsError('invalid-argument', 'shardId is required');
    }
    try {
        await shardManager.splitShard(shardId);
        return {
            success: true,
            message: `Shard ${shardId} split successfully`,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error(`Error splitting shard ${shardId}:`, error);
        throw new https_1.HttpsError('internal', 'Failed to split shard');
    }
});
//# sourceMappingURL=index_poc1.js.map