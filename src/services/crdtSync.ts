import * as Y from "yjs";

/**
 * Phase 1.5 PoC 4: CRDT差分同期
 *
 * 目的: Yjsを使った差分同期で通信量を1/10に削減
 *
 * 仕組み:
 * 1. カードデータをY.Docで管理
 * 2. 変更をDelta（差分）として保存
 * 3. 同期時は差分のみを送信
 * 4. バッチ処理用にスナップショットを抽出
 */

interface CardData {
  id: string;
  question: string;
  answer: string;
  tags?: string[];
  folderId?: string;
  lastReviewAt?: number;
  reviewCount?: number;
}

export class CRDTSyncService {
  private ydoc: Y.Doc;
  private cards: Y.Map<unknown>;

  constructor() {
    this.ydoc = new Y.Doc();
    this.cards = this.ydoc.getMap("cards");
  }

  /**
   * カードデータをCRDTに保存
   */
  async saveCard(cardId: string, cardData: CardData): Promise<void> {
    // Y.Mapに保存
    this.cards.set(cardId, cardData);
  }

  /**
   * カードデータを取得
   */
  getCard(cardId: string): CardData | undefined {
    return this.cards.get(cardId);
  }

  /**
   * 差分（Delta）を取得
   */
  getDelta(): Uint8Array {
    // 最後の状態からの差分を取得
    return Y.encodeStateAsUpdate(this.ydoc);
  }

  /**
   * 差分をFirestoreに保存
   */
  async saveDelta(cardId: string, userId: string): Promise<void> {
    const delta = this.getDelta();

    console.log(
      `[CRDT] Saved delta for card ${cardId} (${userId}), size: ${delta.length} bytes`,
    );

    // 実際の保存処理はここに実装
    // await firestore.collection('crdt_deltas').add(deltaRecord);
  }

  /**
   * 差分を適用
   */
  applyDelta(delta: Uint8Array): void {
    Y.applyUpdate(this.ydoc, delta);
  }

  /**
   * 複数の差分を同期
   */
  async syncDeltas(cardId: string): Promise<void> {
    // Firestoreから差分を取得（実装は省略）
    // const deltas = await firestore.collection('crdt_deltas')
    //   .where('cardId', '==', cardId)
    //   .orderBy('version')
    //   .get();

    // deltas.forEach(doc => {
    //   const delta = doc.data().delta;
    //   this.applyDelta(delta);
    // });

    console.log(`[CRDT] Synced deltas for card ${cardId}`);
  }

  /**
   * スナップショットを抽出（バッチ処理用）
   *
   * Phase 1のMVCC統計更新と互換性を保つため、
   * CRDT構造から通常のCardデータ配列を抽出
   */
  extractSnapshot(): CardData[] {
    const snapshot: CardData[] = [];

    this.cards.forEach((value, key) => {
      snapshot.push({
        id: key,
        ...value,
      });
    });

    return snapshot;
  }

  /**
   * コンパクション（古い差分を統合）
   *
   * 差分が蓄積しすぎた場合、スナップショットを作成して
   * 古い差分を削除することでストレージを節約
   */
  async compactDeltas(cardId: string, userId: string): Promise<void> {
    void cardId;
    void userId;
    // 現在の状態をスナップショットとして保存
    const snapshot = this.extractSnapshot();

    // スナップショットをFirestoreに保存
    console.log(`[CRDT] Compacted ${snapshot.length} cards into snapshot`);

    // 古い差分を削除（実装は省略）
    // await firestore.collection('crdt_deltas')
    //   .where('cardId', '==', cardId)
    //   .where('createdAt', '<', Date.now() - 7 * 24 * 60 * 60 * 1000) // 7日以上前
    //   .get()
    //   .then(snapshot => {
    //     snapshot.docs.forEach(doc => doc.ref.delete());
    //   });
  }

  /**
   * 通信量の比較
   *
   * 全同期方式とCRDT差分方式の通信量を比較
   */
  compareDataSize(fullData: CardData[]): {
    fullSyncSize: number;
    deltaSize: number;
    reduction: number;
  } {
    // 全同期のサイズ（JSON文字列化）
    const fullSyncSize = JSON.stringify(fullData).length;

    // CRDT差分のサイズ
    const delta = this.getDelta();
    const deltaSize = delta.length;

    // 削減率
    const reduction = ((fullSyncSize - deltaSize) / fullSyncSize) * 100;

    console.log(`[CRDT] Data size comparison:`, {
      fullSyncSize: `${fullSyncSize} bytes`,
      deltaSize: `${deltaSize} bytes`,
      reduction: `${reduction.toFixed(1)}%`,
    });

    return {
      fullSyncSize,
      deltaSize,
      reduction,
    };
  }

  /**
   * Y.Docの状態をリセット
   */
  reset(): void {
    this.ydoc.destroy();
    this.ydoc = new Y.Doc();
    this.cards = this.ydoc.getMap("cards");
  }
}




