import { createPerformAutoBackupUseCase } from "@/application/backup/PerformAutoBackup";
import { createCheckDataIntegrityUseCase } from "@/application/integrity/CheckDataIntegrity";
import { localStorageBackupStore } from "@/infrastructure/browser-storage/LocalStorageBackupStore";
import { flags } from "@/features/flags";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
import { sanitizeForLog } from "@/utils/logSanitizer";

export interface RunStartupTasksParams {
  userId: string;
  isDisposed?: () => boolean;
}

const isDisposedDefault = (): boolean => false;

const performAutoBackupUseCase = createPerformAutoBackupUseCase({
  backupStore: localStorageBackupStore,
});

const checkDataIntegrityUseCase = createCheckDataIntegrityUseCase();

export const resetStartupTasks = async (): Promise<void> => {
  const { resetOperationQueue } = await import("@/utils/queueUtils");
  resetOperationQueue();
};

export const runStartupTasks = async ({
  userId,
  isDisposed = isDisposedDefault,
}: RunStartupTasksParams): Promise<void> => {
  try {
    const { initializeOperationQueue } = await import("@/utils/queueUtils");
    const { migrateLegacyImagesToAssets } =
      await import("@/application/startup/MigrateLegacyImagesToAssets");

    await initializeOperationQueue(userId);

    if (isDisposed()) {
      return;
    }

    console.log("[Queue] Operation Queue initialized", { userId });

    const migrationSummary = await migrateLegacyImagesToAssets({ userId });

    if (isDisposed()) {
      return;
    }

    console.log(
      "[LegacyImageMigration] Startup migration finished",
      migrationSummary,
    );

    const didBackup = await performAutoBackupUseCase.execute(userId);

    if (isDisposed()) {
      return;
    }

    if (didBackup) {
      console.log("Auto backup completed on startup");
    }

    const report = await checkDataIntegrityUseCase.execute();

    if (isDisposed()) {
      return;
    }

    if (!report.isHealthy) {
      const issueSummary = report.issues.reduce<Record<string, number>>(
        (accumulator, issue) => {
          accumulator[issue.code] = (accumulator[issue.code] || 0) + 1;
          return accumulator;
        },
        {},
      );

      console.error(
        "[Critical] Data integrity issues found:",
        report.issues.length,
        sanitizeForLog(issueSummary),
      );
    } else {
      console.log(
        "[Safe] Data integrity check passed (0 errors). Healthy items:",
        report.totalCards,
        "cards,",
        report.totalFolders,
        "folders.",
      );
    }

    if (flags.isEnabled("USE_SYNC_V2")) {
      console.log("[Sync] Startup sync initiated");
      const syncService = await SyncServiceFactory.getInstance(userId);

      if (isDisposed()) {
        return;
      }

      await syncService.performStartupSync();
    }
  } catch (error) {
    console.error("[Critical] Startup tasks failed:", sanitizeForLog(error));
  }
};
