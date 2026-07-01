import type { AutoBackupRecord, BackupStorePort } from "@/application/ports/BackupStorePort";



interface PerformAutoBackupDependencies {
  backupStore: BackupStorePort;
  buildSnapshot?: (userId: string) => Promise<AutoBackupRecord>;
  collectUserData?: (userId: string) => Promise<unknown>;
}



const MAX_BACKUPS = 5;



const defaultCollectUserData = async (userId: string): Promise<unknown> => {
  return {
    userId,
    timestamp: Date.now(),
  };
};
const defaultBuildSnapshot =
  (collectUserData: (userId: string) => Promise<unknown>) =>
    async (userId: string): Promise<AutoBackupRecord> => {
      const payload = await collectUserData(userId);

      return {
        id: crypto.randomUUID(),
        userId,
        createdAt: new Date().toISOString(),
        payload,
      };
    };
const createPerformAutoBackupUseCase = ({ backupStore, buildSnapshot, collectUserData = defaultCollectUserData }: PerformAutoBackupDependencies) => {
  const resolvedBuildSnapshot = buildSnapshot ?? defaultBuildSnapshot(collectUserData);

  const execute = async (userId: string): Promise<boolean> => {
    if (!userId) {
      return false;
    }

    try {
      const snapshot = await resolvedBuildSnapshot(userId);
      const existing = backupStore.loadBackups();
      const next = [snapshot, ...existing].slice(0, MAX_BACKUPS);

      if (backupStore.isAvailable()) {
        backupStore.saveBackups(next);
        backupStore.saveLastBackupAt(new Date().toISOString());
      } else {
        console.warn(
          "[PerformAutoBackup] localStorage unavailable. Skipping local backup.",
        );
      }

      return true;
    } catch (error) {
      console.error("[PerformAutoBackup] Failed:", error);
      return false;
    }
  };

  const getLastBackupAt = (): string | null => {
    return backupStore.getLastBackupAt();
  };

  return {
    execute,
    getLastBackupAt,
  };
};



export { createPerformAutoBackupUseCase };


export type { PerformAutoBackupDependencies };
