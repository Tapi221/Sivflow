import { createPerformAutoBackupUseCase } from "@/application/backup/PerformAutoBackup";
import type { AutoBackupRecord } from "@/application/ports/BackupStorePort";
import { localStorageBackupStore } from "@/infrastructure/browser-storage/LocalStorageBackupStore";



type AutoBackup = AutoBackupRecord;



const performAutoBackupUseCase = createPerformAutoBackupUseCase({
  backupStore: localStorageBackupStore,
});
const autoBackupService = { performAutoBackup: async (userId: string): Promise<boolean> => {
  return await performAutoBackupUseCase.execute(userId);
},
getLastBackupAt: (): string | null => {
  return performAutoBackupUseCase.getLastBackupAt();
},
};



export { autoBackupService };


export type { AutoBackup };
