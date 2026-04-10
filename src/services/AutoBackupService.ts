import type { AutoBackupRecord } from "@/application/ports/BackupStorePort";
import { createPerformAutoBackupUseCase } from "@/application/backup/PerformAutoBackup";
import { localStorageBackupStore } from "@/infrastructure/browser-storage/LocalStorageBackupStore";

export type AutoBackup = AutoBackupRecord;

const performAutoBackupUseCase = createPerformAutoBackupUseCase({
  backupStore: localStorageBackupStore,
});

export const autoBackupService = {
  performAutoBackup: async (userId: string): Promise<boolean> => {
    return await performAutoBackupUseCase.execute(userId);
  },
  getLastBackupAt: (): string | null => {
    return performAutoBackupUseCase.getLastBackupAt();
  },
};
