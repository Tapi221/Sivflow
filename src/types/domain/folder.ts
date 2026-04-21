import { Timestamp } from "firebase/firestore";
import type { BaseEntity } from "./base";
import type { UploadedFile } from "./assets";

export type Folder = BaseEntity & {
  parentFolderId?: string | null;
  folderId: string;
  folderName: string;
  folderColor?: string;
  orderIndex?: number;
  cloudSyncEnabled: boolean;
  isSilent?: boolean;
  isHidden?: boolean;
  notePdfs?: UploadedFile[];
  deletedAt?: Date | Timestamp | null;
  lastAccessAt?: Date | Timestamp | null;
};
