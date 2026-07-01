import { Timestamp } from "firebase/firestore";



interface CloudStorageStats {
  id: "current";
  userId: string;
  quotaBytes: number;
  totalStorageUsedBytes: number;
  syncedImageCount: number;
  schemaVersion: number;
  createdAt?: Date | Timestamp | null;
  updatedAt?: Date | Timestamp | null;
  lastRebuiltAt?: Date | Timestamp | null;
}

export type { CloudStorageStats };
