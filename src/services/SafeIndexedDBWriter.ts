import { StorageStateManager } from "./StorageStateManager";
import { notificationService } from "./NotificationService";

/**
 * IndexedDB への書き込みを安全に行う唯一のインターフェース
 *
 * ルール:
 * - このクラス以外から IndexedDB に書き込んではならない
 * - QuotaExceededError はここでのみ検知
 * - 例外は状態遷移に変換
 */
export class SafeIndexedDBWriter {
  private static quotaWarningShown = new Set<string>();

  /**
   * 安全な書き込み
   *
   * @param userId ユーザーID（状態管理用）
   * @param operation 書き込み操作
   * @param context 操作のコンテキスト（ログ用）
   * @returns 成功時: 書き込み結果、失敗時: null
   */
  static async write<T>(
    userId: string,
    operation: () => Promise<T>,
    context: string,
  ): Promise<T | null> {
    // READ_ONLY モードでは書き込みを拒否
    if (StorageStateManager.isReadOnly(userId)) {
      console.warn(`[Storage:${userId}] Write blocked (READ_ONLY): ${context}`);
      return null;
    }

    try {
      return await operation();
    } catch (error: unknown) {
      if (error.name === "QuotaExceededError") {
        // 状態遷移
        StorageStateManager.setReadOnly(userId, context);

        // WARNING レベルの通知（一度だけ）
        if (!this.quotaWarningShown.has(userId)) {
          this.quotaWarningShown.add(userId);

          notificationService.warning(
            "ストレージ容量が不足しています。",
            "既存のデータは保存されています。\n新しいデータの保存ができません。\n\n【対処法】\n1. ブラウザの設定を開く\n2. 「プライバシーとセキュリティ」→「Cookie とサイトデータ」\n3. 不要なサイトのデータを削除\n4. このページをリロード\n\n容量を空けるまで、新しいデータは保存できません。",
            {
              closeable: true,
            },
          );
        }

        return null;
      }

      // QuotaExceededError 以外は再スロー
      throw error;
    }
  }

  /**
   * 一括書き込み
   *
   * @param userId ユーザーID
   * @param operations 書き込み操作の配列
   * @param context 操作のコンテキスト
   * @returns 各操作の結果（失敗時は null）
   */
  static async bulkWrite<T>(
    userId: string,
    operations: Array<() => Promise<T>>,
    context: string,
  ): Promise<Array<T | null>> {
    const results: Array<T | null> = [];

    for (const op of operations) {
      const result = await this.write(userId, op, context);
      results.push(result);

      // 一つでも失敗したら中断
      if (result === null) {
        console.warn(
          `[Storage:${userId}] Bulk write aborted at index ${results.length - 1}`,
        );
        break;
      }
    }

    return results;
  }
}



