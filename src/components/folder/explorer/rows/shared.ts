export const EXPLORER_ROW_BASE_CLASS_NAME =
  "sidebar-row group box-border py-0 relative w-full text-left";

export const FOLDER_ROW_HEIGHT_PX = 32;
export const FOLDER_ROW_ICON_SIZE_CLASS = "h-4 w-4";
export const FOLDER_ROW_TITLE_CLASS =
  "truncate text-[14px] text-[var(--sidebar-text,#202123)]";
export const FOLDER_ROW_ICON_MUTED_CLASS =
  "text-[var(--sidebar-text-muted,#6e6e80)]";
export const FOLDER_ROW_ICON_ACTIVE_CLASS = "text-[var(--sidebar-text,#202123)]";

export const getExplorerRowStyle = (depth: number) => ({
  paddingLeft: `calc(4px + ${depth} * var(--tree-indent-px))`,
  height: "var(--row-height-normal)",
  minHeight: "var(--row-height-normal)",
  lineHeight: "var(--row-height-normal)",
  boxSizing: "border-box" as const,
});




