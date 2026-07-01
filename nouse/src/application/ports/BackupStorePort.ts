interface AutoBackupRecord {
  id: string;
  userId: string;
  createdAt: string;
  payload: unknown;
}
interface BackupStorePort {
  isAvailable: () => boolean;
  loadBackups: () => AutoBackupRecord[];
  saveBackups: (backups: AutoBackupRecord[]) => void;
  saveLastBackupAt: (value: string) => void;
  getLastBackupAt: () => string | null;
  clearBackups: () => void;
}

export type { AutoBackupRecord, BackupStorePort };
