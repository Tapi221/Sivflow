"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCRDTStats = exports.compactCRDTDeltas = exports.saveCRDTSnapshot = exports.getCRDTDeltas = exports.saveCRDTDelta = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const firestore = admin.firestore();
/**
 * Phase 1.5 PoC 4: CRDT差分同期用Cloud Functions
 *
 * 注意: クライアント側でYjsを使用するため、
 * サーバー側は差分の保存・取得のみを担当
 */
/**
 * CRDT差分を保存
 */
exports.saveCRDTDelta = (0, https_1.onCall)(async (request) => {
    var _a;
    const { cardId, delta, version } = request.data;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    if (!cardId || !delta || typeof version !== 'number') {
        throw new https_1.HttpsError('invalid-argument', 'Invalid parameters');
    }
    try {
        // 差分をFirestoreに保存
        await firestore
            .collection('crdt_deltas')
            .add({
            cardId,
            userId,
            delta: Buffer.from(delta).toString('base64'),
            version,
            createdAt: firestore_1.FieldValue.serverTimestamp()
        });
        console.log(`[CRDT] Saved delta for card ${cardId}, version ${version}`);
        return {
            success: true,
            message: 'Delta saved successfully'
        };
    }
    catch (error) {
        console.error('Error saving CRDT delta:', error);
        throw new https_1.HttpsError('internal', 'Failed to save delta');
    }
});
/**
 * CRDT差分を取得
 */
exports.getCRDTDeltas = (0, https_1.onCall)(async (request) => {
    var _a;
    const { cardId, sinceVersion } = request.data;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    if (!cardId) {
        throw new https_1.HttpsError('invalid-argument', 'cardId is required');
    }
    try {
        let query = firestore
            .collection('crdt_deltas')
            .where('cardId', '==', cardId)
            .where('userId', '==', userId)
            .orderBy('version', 'asc');
        // 特定バージョン以降の差分のみ取得
        if (typeof sinceVersion === 'number') {
            query = query.where('version', '>', sinceVersion);
        }
        const snapshot = await query.get();
        const deltas = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                cardId: data.cardId,
                delta: data.delta,
                version: data.version,
                createdAt: data.createdAt
            };
        });
        console.log(`[CRDT] Retrieved ${deltas.length} deltas for card ${cardId}`);
        return {
            success: true,
            deltas,
            count: deltas.length
        };
    }
    catch (error) {
        console.error('Error getting CRDT deltas:', error);
        throw new https_1.HttpsError('internal', 'Failed to get deltas');
    }
});
/**
 * CRDTスナップショットを保存
 *
 * コンパクション時に使用
 */
exports.saveCRDTSnapshot = (0, https_1.onCall)(async (request) => {
    var _a;
    const { cardId, snapshot } = request.data;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    if (!cardId || !snapshot) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid parameters');
    }
    try {
        // スナップショットを保存
        await firestore
            .collection('crdt_snapshots')
            .doc(`${userId}_${cardId}`)
            .set({
            cardId,
            userId,
            snapshot,
            createdAt: firestore_1.FieldValue.serverTimestamp()
        });
        console.log(`[CRDT] Saved snapshot for card ${cardId}`);
        return {
            success: true,
            message: 'Snapshot saved successfully'
        };
    }
    catch (error) {
        console.error('Error saving CRDT snapshot:', error);
        throw new https_1.HttpsError('internal', 'Failed to save snapshot');
    }
});
/**
 * 古いCRDT差分を削除（コンパクション）
 */
exports.compactCRDTDeltas = (0, https_1.onCall)(async (request) => {
    var _a;
    const { cardId, beforeVersion } = request.data;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    if (!cardId || typeof beforeVersion !== 'number') {
        throw new https_1.HttpsError('invalid-argument', 'Invalid parameters');
    }
    try {
        // 指定バージョン以前の差分を削除
        const snapshot = await firestore
            .collection('crdt_deltas')
            .where('cardId', '==', cardId)
            .where('userId', '==', userId)
            .where('version', '<', beforeVersion)
            .get();
        const batch = firestore.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`[CRDT] Compacted ${snapshot.size} deltas for card ${cardId}`);
        return {
            success: true,
            deletedCount: snapshot.size,
            message: `Compacted ${snapshot.size} deltas`
        };
    }
    catch (error) {
        console.error('Error compacting CRDT deltas:', error);
        throw new https_1.HttpsError('internal', 'Failed to compact deltas');
    }
});
/**
 * CRDT統計情報を取得（管理者用）
 */
exports.getCRDTStats = (0, https_1.onCall)(async (request) => {
    // 管理者権限チェック
    if (!request.auth || !request.auth.token.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        // 差分の総数
        const deltasSnapshot = await firestore
            .collection('crdt_deltas')
            .count()
            .get();
        // スナップショットの総数
        const snapshotsSnapshot = await firestore
            .collection('crdt_snapshots')
            .count()
            .get();
        // サンプルデータで通信量削減率を計算
        const sampleDeltas = await firestore
            .collection('crdt_deltas')
            .limit(100)
            .get();
        let totalDeltaSize = 0;
        sampleDeltas.docs.forEach((doc) => {
            const delta = doc.data().delta;
            totalDeltaSize += delta.length;
        });
        const avgDeltaSize = sampleDeltas.size > 0
            ? totalDeltaSize / sampleDeltas.size
            : 0;
        return {
            success: true,
            stats: {
                totalDeltas: deltasSnapshot.data().count,
                totalSnapshots: snapshotsSnapshot.data().count,
                avgDeltaSize: Math.round(avgDeltaSize),
                estimatedReduction: '90%' // 理論値
            },
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error getting CRDT stats:', error);
        throw new https_1.HttpsError('internal', 'Failed to get stats');
    }
});
//# sourceMappingURL=index_poc4.js.map