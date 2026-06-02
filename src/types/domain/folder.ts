import { Timestamp } from "firebase/firestore";
import type { UploadedFile } from "./assets";
import type { BaseEntity } from "./base";

export type Folder = BaseEntity & {
  parentFolderId?: string | null;
  folderId: string;
  folderName: string;
  folderColor?: string;
  orderIndex?: number;
  cloudSyncEnabled: boolean;
  isFavorite?: boolean;
  isSilent?: boolean;
  isHidden?: boolean;
  tags?: string[];
  notePdfs?: UploadedFile[];
  deletedAt?: Date | Timestamp | null;
  lastAccessAt?: Date | Timestamp | null;
};