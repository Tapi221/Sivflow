import type { BaseEntity } from "./base";



type CardDisplayMode = "fixed" | "fluid";
/**
 * CardSet — Card のコレクション単位。
 * Folder 直下に複数存在し、Card は必ず CardSet に属する。
 *
 * Folder -> CardSet -> Card
 */
type CardSet = BaseEntity & { /** 所属する Folder の ID（null = ルート相当の "未分類" セット） */ folderId: string | null;
  name: string;
  description?: string;
  orderIndex: number;
  defaultDisplayMode?: CardDisplayMode;
  tags?: string[];
};



const DEFAULT_CARD_DISPLAY_MODE: CardDisplayMode = "fixed";



const normalizeCardDisplayMode = (value: unknown) => {
  return value === "fluid" ? "fluid" : "fixed";
};



export { DEFAULT_CARD_DISPLAY_MODE, normalizeCardDisplayMode };


export type { CardDisplayMode, CardSet };
