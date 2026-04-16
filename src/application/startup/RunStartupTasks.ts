import { createPerformAutoBackupUseCase } from "@/application/backup/PerformAutoBackup";
import { createCheckDataIntegrityUseCase } from "@/application/integrity/CheckDataIntegrity";
import { createHardDeleteOrphanedCardsUseCase } from "@/application/integrity/HardDeleteOrphanedCards";
import { localStorageBackupStore } from "@/infrastructure/browser-storage/LocalStorageBackupStore";
import { flags } from "@/features/flags";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
import type {
  IntegrityIssue,
  IntegrityReport,
} from "@/services/dataIntegrityTypes";
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
const hardDeleteOrphanedCardsUseCase = createHardDeleteOrphanedCardsUseCase();

const summarizeIssueCodes = (
  issues: readonly IntegrityIssue[],
): Record<string, number> => {
  return issues.reduce<Record<string, number>>((accumulator, issue) => {
    accumulator[issue.code] = (accumulator[issue.code] || 0) + 1;
    return accumulator;
  }, {});
};

const countInvalidFolderRefCards = (report: IntegrityReport): number => {
  return report.issues.filter(
    (issue) =>
      issue.code === "INVALID_FOLDER_REF" && issue.entityType === "card",
  ).length;
};

const logIntegrityReport = (report: IntegrityReport): void => {
  if (!report.isHealthy) {
    console.error(
      "[Critical] Data integrity issues found:",
      report.issues.length,
      sanitizeForLog(summarizeIssueCodes(report.issues)),
    );
    return;
  }

  console.log(
    "[Safe] Data integrity check passed (0 errors). Healthy items:",
    report.totalCards,
    "cards,",
    report.totalFolders,
    "folders.",
  );
};

export const resetStartupTasks = async (): Promise<void> => {
  const { resetOperationQueue } = await import("@/utils/queueUtils");
  resetOperationQueue();
};

export const runStartupTasks = async ({
  userId,
  isDisposed = isDisposedDefault,
}: RunStartupTasksParams): Promise<void> => {
  try {
    const { migrateLegacyImagesToAssets } =
      await import("@/application/startup/MigrateLegacyImagesToAssets");

    if (!flags.isEnabled("USE_SYNC_V2")) {
      const { initializeOperationQueue } = await import("@/utils/queueUtils");
      await initializeOperationQueue(userId);

      if (isDisposed()) {
        return;
      }

      console.log("[Queue] Operation Queue initialized", { userId });
    }

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

    let report = await checkDataIntegrityUseCase.execute();

    if (isDisposed()) {
      return;
    }

    const invalidFolderRefCount = countInvalidFolderRefCards(report);

    if (invalidFolderRefCount > 0) {
      const cleanupResult = await hardDeleteOrphanedCardsUseCase.execute(
        userId,
        report,
      );

      if (isDisposed()) {
        return;
      }

      console.warn(
        "[Integrity] Hard-deleted orphaned cards with invalid folder references",
        sanitizeForLog(cleanupResult),
      );

      report = await checkDataIntegrityUseCase.execute();

      if (isDisposed()) {
        return;
      }
    }

    logIntegrityReport(report);

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
