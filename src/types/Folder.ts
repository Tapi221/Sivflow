// Folder.ts

import { Timestamp } from 'firebase/firestore';
import type { BaseEntity, UploadedImage, UploadedFile } from './index'; // BaseEntity は index.ts からエクスポートされている

export type Folder = BaseEntity & {
  parentFolderId?: string | null;
  folderId: string; // エイリアス: id と同じ
  folderName: string;
  folderColor?: string;
  orderIndex?: number;
  cloudSyncEnabled: boolean;
  isDeleted?: boolean;
  deletedAt?: Date | Timestamp | null;
  memoText?: string;
  memoImages?: UploadedImage[];
  notePdfs?: UploadedFile[];
  lastAccessAt?: Date | Timestamp | null; // 最終アクセス日時
};
