import { notificationService } from "@/services/NotificationService";
import { StorageStateManager } from "@/services/StorageStateManager";

const isQuotaExceededError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;

  const record = error as Record<string, unknown>;
  return (
    record.name === "QuotaExceededError" || record.code === "QuotaExceededError"
  );
};
class SafeIndexedDBWriter {
  private static readonly quotaWarningShown = new Set<string>();

  static readonly write = async <T>(
    userId: string,
    operation: () => Promise<T>,
    context: string,
  ): Promise<T | null> => {
    if (StorageStateManager.isReadOnly(userId)) {
      console.warn(`[Storage:${userId}] 書き込みをブロックしました（READ_ONLY）: ${context}`);
      return null;
    }

    try {
      return await operation();
    } catch (error: unknown) {
      if (isQuotaExceededError(error)) {
        StorageStateManager.setReadOnly(userId, context);

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

      throw error;
    }
  };

  static readonly bulkWrite = async <T>(
    userId: string,
    operations: Array<() => Promise<T>>,
    context: string,
  ): Promise<Array<T | null>> => {
    const results: Array<T | null> = [];

    for (const operation of operations) {
      const result = await this.write(userId, operation, context);
      results.push(result);

      if (result === null) {
        console.warn(
          `[Storage:${userId}] 一括書き込みを中断しました。中断位置: ${results.length - 1}`,
        );
        break;
      }
    }

    return results;
  };
}

export { SafeIndexedDBWriter };
