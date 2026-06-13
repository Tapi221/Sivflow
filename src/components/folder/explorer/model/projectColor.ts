import type { FolderTreeNode } from "./utils";
import { getFolderId } from "./utils";



const PROJECT_COLOR_PALETTE = ["#2f9d63", "#e25555", "#3f7fe5", "#d99600", "#1f9aa5", "#4f8f63", "#7c62d9", "#e8783c"];
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;



const isProjectColor = (value: unknown): value is string => typeof value === "string" && HEX_COLOR_PATTERN.test(value);
const hashString = (value: string): number => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
};
const getFallbackProjectColor = (seed: string): string => PROJECT_COLOR_PALETTE[hashString(seed) % PROJECT_COLOR_PALETTE.length];
const getFolderProjectColor = (folder: FolderTreeNode): string => {
  const record = folder as { folderColor?: unknown; folder_color?: unknown; color?: unknown; };
  const folderColor = record.folderColor ?? record.folder_color ?? record.color;
  if (isProjectColor(folderColor)) return folderColor;

  return getFallbackProjectColor(getFolderId(folder));
};



export { isProjectColor, getFallbackProjectColor, getFolderProjectColor };
