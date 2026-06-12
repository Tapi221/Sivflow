import { createPerformAutoBackupUseCase } from "@/application/backup/PerformAutoBackup";
import { createCheckDataIntegrityUseCase } from "@/application/integrity/CheckDataIntegrity";
import { localStorageBackupStore } from "@/infrastructure/browser-storage/LocalStorageBackupStore";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
import { sanitizeForLog } from "@/utils/logSanitizer";



interface RunStartupTasksParams {
  userId: string;
  isDisposed?: () => boolean;
}



const performAutoBackupUseCase = createPerformAutoBackupUseCase({
  backupStore: localStorageBackupStore,
});
const checkDataIntegrityUseCase = createCheckDataIntegrityUseCase();



const isDisposedDefault = (): boolean => false;
const logIntegrityReport = (report: Awaited<ReturnType<typeof checkDataIntegrityUseCase.execute>>) => {
  if (!report.isHealthy) {
    const issueSummary = report.issues.reduce<Record<string, number>>(
      (accumulator, issue) => {
        accumulator[issue.code] = (accumulator[issue.code] || 0) + 1;
        return accumulator;
      },
      {},
    );

    console.error(
      "[重大] データ整合性の問題を検出しました:",
      report.issues.length,
      sanitizeForLog(issueSummary),
    );
    return;
  }

  console.log(
    "[安全] データ整合性チェックは正常です（エラー 0 件）。正常な項目:",
    report.totalCards,
    "カード,",
    report.totalFolders,
    "フォルダー。",
  );
};
/**
 * Sync V2 移行完了後の startup reset。
 * 起動時の追加タスクを実行する。
 * 同期は常に SyncServiceFactory 経由の現行実装を使用する。
 *
 * App.tsx からの既存呼び出し互換を維持するため関数自体は残す。
 */
const resetStartupTasks = async (): Promise<void> => {
  return Promise.resolve();
};
const runStartupTasks = async ({ userId, isDisposed = isDisposedDefault }: RunStartupTasksParams): Promise<void> => {
  try {
    const { migrateLegacyImagesToAssets } = await import("./MigrateLegacyImagesToAssets");

    const migrationSummary = await migrateLegacyImagesToAssets({ userId });

    if (isDisposed()) {
      return;
    }

    console.log(
      "[レガシー画像移行] 起動時移行が完了しました",
      migrationSummary,
    );

    const didBackup = await performAutoBackupUseCase.execute(userId);

    if (isDisposed()) {
      return;
    }

    if (didBackup) {
      console.log("起動時の自動バックアップが完了しました");
    }

    const syncService = await SyncServiceFactory.getInstance(userId);

    if (isDisposed()) {
      return;
    }

    console.log("[同期] 起動時同期を開始しました");
    await syncService.performStartupSync();

    if (isDisposed()) {
      return;
    }

    const report = await checkDataIntegrityUseCase.execute();

    if (isDisposed()) {
      return;
    }

    logIntegrityReport(report);
  } catch (error) {
    console.error("[重大] 起動時タスクに失敗しました:", sanitizeForLog(error));
  }
};



export { resetStartupTasks, runStartupTasks };


export type { RunStartupTasksParams };
