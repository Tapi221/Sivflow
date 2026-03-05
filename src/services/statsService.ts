import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

interface StatsUpdateData {
  date: string;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
}

interface StatsUpdateResult {
  success: boolean;
  updatedAt: Date;
}

export async function updateStats(
  data: StatsUpdateData,
): Promise<StatsUpdateResult> {
  try {
    const updateStatsFunction = httpsCallable<
      StatsUpdateData,
      StatsUpdateResult
    >(functions, "updateStats");

    const result = await updateStatsFunction(data);
    return result.data;
  } catch (error: unknown) {
    console.error("updateStats error:", error);
    // エラーが発生してもアプリがクラッシュしないように、静かに失敗する
    // Cloud Functionsがデプロイされていない場合など、開発環境でよく発生する
    if (error instanceof Error) {
      console.warn(
        "統計更新に失敗しました（開発環境では無視されます）:",
        error.message,
      );
    }
    // ダミーデータを返して続行
    return {
      success: false,
      updatedAt: new Date(),
    };
  }
}

export async function recordLogin(): Promise<{
  success: boolean;
  consecutiveDays?: number;
}> {
  try {
    const recordLoginFunction = httpsCallable<
      Record<string, never>,
      { success: boolean; consecutiveDays?: number }
    >(functions, "recordLogin");

    const result = await recordLoginFunction({});
    return result.data;
  } catch (error: unknown) {
    console.error("recordLogin error:", error);
    // エラーが発生してもアプリがクラッシュしないように、静かに失敗する
    if (error instanceof Error) {
      console.warn(
        "ログイン記録に失敗しました（開発環境では無視されます）:",
        error.message,
      );
    }
    return {
      success: false,
      consecutiveDays: 0,
    };
  }
}
