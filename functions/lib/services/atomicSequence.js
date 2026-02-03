"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AtomicSequenceService = void 0;
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const firestore = admin.firestore();
class AtomicSequenceService {
    /**
     * 仮シーケンスを即座に発行
     *
     * Atomic Incrementを使用するため、競合なしで高速
     */
    async assignTemporarySeq(userId) {
        var _a;
        const shardId = this.getShardId(userId);
        // シャードカウンターをアトミックにインクリメント
        const shardRef = firestore
            .collection('_system')
            .doc('temp_sequence_shards')
            .collection('shards')
            .doc(shardId);
        // Atomic Increment（競合なし）
        await shardRef.set({
            counter: firestore_1.FieldValue.increment(1),
            lastUpdated: firestore_1.FieldValue.serverTimestamp()
        }, { merge: true });
        // 更新後の値を取得
        const snapshot = await shardRef.get();
        const tempSeq = ((_a = snapshot.data()) === null || _a === void 0 ? void 0 : _a.counter) || 0;
        // マッピングタスクをキューに追加
        await this.enqueueMappingTask(tempSeq, userId, shardId);
        console.log(`[AtomicSeq] Assigned tempSeq ${tempSeq} to user ${userId}`);
        return tempSeq;
    }
    /**
     * マッピングタスクをキューに追加
     */
    async enqueueMappingTask(tempSeq, userId, shardId) {
        const taskRef = firestore
            .collection('_system')
            .doc('sequence_mapping_queue')
            .collection('tasks')
            .doc(`${shardId}_${tempSeq}`);
        await taskRef.set({
            tempSeq,
            userId,
            shardId,
            createdAt: firestore_1.Timestamp.now(),
            status: 'pending'
        });
    }
    /**
     * マッピングキューを処理（バックグラウンド実行）
     *
     * 定期的に呼び出され、仮シーケンスをグローバルシーケンスにマッピング
     */
    async processMappingQueue() {
        const tasksSnapshot = await firestore
            .collection('_system')
            .doc('sequence_mapping_queue')
            .collection('tasks')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .limit(AtomicSequenceService.MAPPING_BATCH_SIZE)
            .get();
        let processedCount = 0;
        for (const taskDoc of tasksSnapshot.docs) {
            const task = taskDoc.data();
            try {
                // グローバルシーケンスを採番
                const globalSeq = await this.assignGlobalSequence(task.userId);
                // マッピングを記録
                await this.recordMapping(task.tempSeq, globalSeq, task.userId);
                // タスクを完了としてマーク
                await taskDoc.ref.update({
                    status: 'completed',
                    completedAt: firestore_1.Timestamp.now()
                });
                processedCount++;
            }
            catch (error) {
                console.error(`[AtomicSeq] Failed to process task ${taskDoc.id}:`, error);
                // エラーをマーク
                await taskDoc.ref.update({
                    status: 'failed',
                    error: String(error),
                    failedAt: firestore_1.Timestamp.now()
                });
            }
        }
        console.log(`[AtomicSeq] Processed ${processedCount} mapping tasks`);
        return processedCount;
    }
    /**
     * グローバルシーケンスを採番（Phase 1のロジックを再利用）
     */
    async assignGlobalSequence(userId) {
        const shardId = this.getShardId(userId);
        const shardRef = firestore
            .collection('_system')
            .doc('global_sequence_shards')
            .collection('shards')
            .doc(shardId);
        let globalSeq = 0;
        await firestore.runTransaction(async (transaction) => {
            var _a;
            const doc = await transaction.get(shardRef);
            if (!doc.exists) {
                globalSeq = 1;
                transaction.set(shardRef, {
                    counter: 1,
                    lastUpdated: firestore_1.Timestamp.now()
                });
            }
            else {
                globalSeq = (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.counter) || 0) + 1;
                transaction.update(shardRef, {
                    counter: globalSeq,
                    lastUpdated: firestore_1.Timestamp.now()
                });
            }
        });
        return globalSeq;
    }
    /**
     * マッピングを記録
     */
    async recordMapping(tempSeq, globalSeq, userId) {
        const mappingRef = firestore
            .collection('_system')
            .doc('sequence_mappings')
            .collection('mappings')
            .doc(`temp_${tempSeq}`);
        await mappingRef.set({
            tempSeq,
            globalSeq,
            userId,
            createdAt: firestore_1.Timestamp.now()
        });
        console.log(`[AtomicSeq] Mapped tempSeq ${tempSeq} -> globalSeq ${globalSeq}`);
    }
    /**
     * 仮シーケンスからグローバルシーケンスを解決
     */
    async resolveGlobalSeq(tempSeq) {
        var _a;
        const mappingRef = firestore
            .collection('_system')
            .doc('sequence_mappings')
            .collection('mappings')
            .doc(`temp_${tempSeq}`);
        const snapshot = await mappingRef.get();
        if (!snapshot.exists) {
            return null; // まだマッピングされていない
        }
        return ((_a = snapshot.data()) === null || _a === void 0 ? void 0 : _a.globalSeq) || null;
    }
    /**
     * シャードIDを計算
     */
    getShardId(userId) {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = ((hash << 5) - hash) + userId.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        const shardIndex = Math.abs(hash) % AtomicSequenceService.SHARD_COUNT;
        return `shard_${shardIndex}`;
    }
}
exports.AtomicSequenceService = AtomicSequenceService;
AtomicSequenceService.SHARD_COUNT = 10;
AtomicSequenceService.MAPPING_BATCH_SIZE = 100;
//# sourceMappingURL=atomicSequence.js.map