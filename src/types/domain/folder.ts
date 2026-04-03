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
};





