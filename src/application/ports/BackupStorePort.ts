export interface AutoBackupRecord {
  id: string;
  userId: string;
  createdAt: string;
  payload: unknown;
}

export interface BackupStorePort {
  isAvailable: () => boolean;
  loadBackups: () => AutoBackupRecord[];
  saveBackups: (backups: AutoBackupRecord[]) => void;
  saveLastBackupAt: (value: string) => void;
  getLastBackupAt: () => string | null;
  clearBackups: () => void;
}
