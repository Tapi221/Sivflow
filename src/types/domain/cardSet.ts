import type { BaseEntity } from "./base";

export type CardDisplayMode = "fixed" | "fluid";

export const DEFAULT_CARD_DISPLAY_MODE: CardDisplayMode = "fixed";

export const normalizeCardDisplayMode = (value: unknown) => {
  return value === "fluid" ? "fluid" : "fixed";
};

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
  defaultDisplayMode?: CardDisplayMode;
  tags?: string[];
};
