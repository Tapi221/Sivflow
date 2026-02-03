"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShardManager = void 0;
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const firestore = admin.firestore();
class ShardManager {
    /**
     * シャードの負荷メトリクスを監視
     */
    async monitorShardLoad(shardId) {
        const metricsRef = firestore
            .collection('_system')
            .doc('shard_metrics')
            .collection('metrics')
            .doc(shardId);
        const snapshot = await metricsRef.get();
        if (!snapshot.exists) {
            // 初期メトリクス
            const initialMetrics = {
                opsPerSecond: 0,
                avgLatency: 0,
                errorRate: 0,
                timestamp: firestore_1.Timestamp.now()
            };
            await metricsRef.set(initialMetrics);
            return initialMetrics;
        }
        return snapshot.data();
    }
    /**
     * 負荷メトリクスを記録
     */
    async recordMetric(shardId, latency, success) {
        const metricsRef = firestore
            .collection('_system')
            .doc('shard_metrics')
            .collection('metrics')
            .doc(shardId);
        await firestore.runTransaction(async (transaction) => {
            const doc = await transaction.get(metricsRef);
            const current = doc.data() || {
                opsPerSecond: 0,
                avgLatency: 0,
                errorRate: 0,
                timestamp: firestore_1.Timestamp.now()
            };
            // 移動平均で更新
            const alpha = 0.1; // 平滑化係数
            const newOpsPerSecond = current.opsPerSecond * (1 - alpha) + alpha;
            const newAvgLatency = current.avgLatency * (1 - alpha) + latency * alpha;
            const newErrorRate = current.errorRate * (1 - alpha) + (success ? 0 : 1) * alpha;
            transaction.set(metricsRef, {
                opsPerSecond: newOpsPerSecond,
                avgLatency: newAvgLatency,
                errorRate: newErrorRate,
                timestamp: firestore_1.Timestamp.now()
            });
        });
    }
    /**
     * シャード分割が必要か判定
     */
    async shouldSplitShard(shardId) {
        const metrics = await this.monitorShardLoad(shardId);
        // いずれかの閾値を超えたら分割
        const shouldSplit = metrics.opsPerSecond > ShardManager.LOAD_THRESHOLD_OPS ||
            metrics.avgLatency > ShardManager.LATENCY_THRESHOLD_MS ||
            metrics.errorRate > ShardManager.ERROR_RATE_THRESHOLD;
        if (shouldSplit) {
            console.log(`[ShardManager] Shard ${shardId} exceeds threshold:`, {
                opsPerSecond: metrics.opsPerSecond,
                avgLatency: metrics.avgLatency,
                errorRate: metrics.errorRate
            });
        }
        return shouldSplit;
    }
    /**
     * シャードを分割
     */
    async splitShard(shardId) {
        const metadataRef = firestore
            .collection('_system')
            .doc('shard_metadata')
            .collection('shards')
            .doc(shardId);
        await firestore.runTransaction(async (transaction) => {
            const doc = await transaction.get(metadataRef);
            if (!doc.exists) {
                throw new Error(`Shard ${shardId} metadata not found`);
            }
            const metadata = doc.data();
            // 既に分割済みの場合はスキップ
            if (metadata.subShards && metadata.subShards.length > 0) {
                console.log(`[ShardManager] Shard ${shardId} already split`);
                return;
            }
            // サブシャードを2つ作成
            const subShard1 = `${shardId}_0`;
            const subShard2 = `${shardId}_1`;
            // 親シャードを非アクティブ化
            transaction.update(metadataRef, {
                isActive: false,
                subShards: [subShard1, subShard2],
                splitAt: firestore_1.Timestamp.now()
            });
            // サブシャード1のメタデータ作成
            const subShard1Ref = firestore
                .collection('_system')
                .doc('shard_metadata')
                .collection('shards')
                .doc(subShard1);
            transaction.set(subShard1Ref, {
                shardId: subShard1,
                parentShardId: shardId,
                subShards: [],
                isActive: true,
                createdAt: firestore_1.Timestamp.now(),
                loadMetrics: {
                    opsPerSecond: 0,
                    avgLatency: 0,
                    errorRate: 0,
                    timestamp: firestore_1.Timestamp.now()
                }
            });
            // サブシャード2のメタデータ作成
            const subShard2Ref = firestore
                .collection('_system')
                .doc('shard_metadata')
                .collection('shards')
                .doc(subShard2);
            transaction.set(subShard2Ref, {
                shardId: subShard2,
                parentShardId: shardId,
                subShards: [],
                isActive: true,
                createdAt: firestore_1.Timestamp.now(),
                loadMetrics: {
                    opsPerSecond: 0,
                    avgLatency: 0,
                    errorRate: 0,
                    timestamp: firestore_1.Timestamp.now()
                }
            });
            console.log(`[ShardManager] Shard ${shardId} split into ${subShard1} and ${subShard2}`);
        });
    }
    /**
     * ユーザーIDから適切なシャードIDを取得（動的分割対応）
     */
    async getActiveShardForUser(userId) {
        // 基本シャードIDを計算
        const baseShardId = this.calculateBaseShardId(userId);
        // メタデータを確認
        const metadataRef = firestore
            .collection('_system')
            .doc('shard_metadata')
            .collection('shards')
            .doc(baseShardId);
        const doc = await metadataRef.get();
        if (!doc.exists) {
            // メタデータが存在しない場合は初期化
            await this.initializeShardMetadata(baseShardId);
            return baseShardId;
        }
        const metadata = doc.data();
        // アクティブな場合はそのまま返す
        if (metadata.isActive) {
            return baseShardId;
        }
        // 分割済みの場合はサブシャードを選択
        if (metadata.subShards && metadata.subShards.length > 0) {
            return this.selectSubShard(userId, metadata.subShards);
        }
        return baseShardId;
    }
    /**
     * 基本シャードIDを計算（Phase 1と同じロジック）
     */
    calculateBaseShardId(userId) {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = ((hash << 5) - hash) + userId.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        const shardIndex = Math.abs(hash) % 10;
        return `shard_${shardIndex}`;
    }
    /**
     * サブシャードを選択（二次ハッシュ）
     */
    selectSubShard(userId, subShards) {
        // タイムスタンプを含めた二次ハッシュ
        const secondaryHash = this.calculateSecondaryHash(userId);
        const index = Math.abs(secondaryHash) % subShards.length;
        return subShards[index];
    }
    /**
     * 二次ハッシュを計算
     */
    calculateSecondaryHash(userId) {
        const timestamp = Date.now().toString();
        const combined = userId + timestamp;
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) - hash) + combined.charCodeAt(i);
            hash = hash & hash;
        }
        return hash;
    }
    /**
     * シャードメタデータを初期化
     */
    async initializeShardMetadata(shardId) {
        const metadataRef = firestore
            .collection('_system')
            .doc('shard_metadata')
            .collection('shards')
            .doc(shardId);
        await metadataRef.set({
            shardId,
            subShards: [],
            isActive: true,
            createdAt: firestore_1.Timestamp.now(),
            loadMetrics: {
                opsPerSecond: 0,
                avgLatency: 0,
                errorRate: 0,
                timestamp: firestore_1.Timestamp.now()
            }
        });
    }
    /**
     * すべてのシャードの負荷状況を取得
     */
    async getAllShardMetrics() {
        const metricsSnapshot = await firestore
            .collection('_system')
            .doc('shard_metrics')
            .collection('metrics')
            .get();
        const metrics = new Map();
        metricsSnapshot.docs.forEach((doc) => {
            metrics.set(doc.id, doc.data());
        });
        return metrics;
    }
}
exports.ShardManager = ShardManager;
ShardManager.LOAD_THRESHOLD_OPS = 500; // ops/秒
ShardManager.LATENCY_THRESHOLD_MS = 200;
ShardManager.ERROR_RATE_THRESHOLD = 0.05; // 5%
//# sourceMappingURL=shardManager.js.map