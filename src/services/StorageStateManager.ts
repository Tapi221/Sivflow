/**
 * ストレージの状態を管理する唯一のクラス
 *
 * 重要: 状態は userId スコープ（グローバルではない）
 *
 * 状態遷移:
 * NORMAL → QUOTA_EXCEEDED → READ_ONLY
 * READ_ONLY →（cache 削除後）→ NORMAL
 */
class StorageStateManager {
  private static states = new Map<string, { state: "NORMAL" | "READ_ONLY";
    lastError: Date | null;
  }
  >();

  /**
   * READ_ONLY モードに遷移
   */
  static setReadOnly(userId: string, reason: string): void {
    const current = this.getState(userId);
    if (current.state === "READ_ONLY") return;

    this.states.set(userId, {
      state: "READ_ONLY",
      lastError: new Date(),
    });

    console.error(`[Storage:${userId}] READ_ONLY モードに移行しました:`, reason);

    // ログ記録（後で分析）
    this.logStorageEvent(userId, "quota_exceeded", { reason });

    // 高コストキャッシュを非同期削除
    this.clearHighCostCache(userId);
  }

  /**
   * READ_ONLY モードかどうか
   */
  static isReadOnly(userId: string): boolean {
    return this.getState(userId).state === "READ_ONLY";
  }

  /**
   * 状態をリセット（NORMAL に戻す）
   */
  static reset(userId: string): void {
    this.states.set(userId, {
      state: "NORMAL",
      lastError: null,
    });
  }

  /**
   * 状態を取得（なければ初期化）
   */
  private static getState(userId: string) {
    if (!this.states.has(userId)) {
      this.states.set(userId, { state: "NORMAL", lastError: null });
    }
    return this.states.get(userId)!;
  }

  /**
   * 高コストキャッシュを削除（レイヤーC）
   */
  private static async clearHighCostCache(userId: string): Promise<void> {
    try {
    // TODO: レイヤーC（高コスト生成）のキャッシュを削除
    // - 検索用インデックス
    // - 複雑な並び替え用キャッシュ
      console.log(`[Storage:${userId}] 高コストキャッシュを削除しています...`);
    } catch (error) {
      console.error(`[Storage:${userId}] キャッシュの削除に失敗しました:`, error);
    }
  }

  /**
   * ストレージイベントをログ記録
   */
  private static logStorageEvent(
    userId: string,
    event: string,
    data: unknown,
  ): void {
    console.log(`[StorageEvent:${userId}]`, event, data);

  // TODO: 本番環境では外部ログサービスに送信
  // - Sentry
  // - Firebase Analytics
  // - カスタムログ収集
  }
}

export { StorageStateManager };
