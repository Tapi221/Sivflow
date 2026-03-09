import type { BaseEntity } from "./base";

/**
 * CardSet — Card のコレクション単位。
 * Folder 直下に複数存在し、Card は必ず CardSet に属する。
 *
 * Folder -> CardSet -> Card
 */
export type CardSet = BaseEntity & {
  /** 所属する Folder の ID（null = ルート相当の "未分類" セット） */
  folderId: string | null;
  name: string;
  description?: string;
  orderIndex: number;
};
