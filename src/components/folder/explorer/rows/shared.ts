export const EXPLORER_ROW_BASE_CLASS_NAME =
  "sidebar-row group box-border py-0 relative w-full text-left";
export const EXPLORER_ROW_CONTENT_CLASS =
  "flex h-full min-w-0 flex-1 items-center pr-1";
export const EXPLORER_ROW_LEADING_SLOT_CLASS =
  "sidebar-action flex h-full w-4 shrink-0 items-center justify-center";
export const EXPLORER_ROW_ICON_SLOT_CLASS =
  "flex h-full w-4 shrink-0 items-center justify-center";
export const EXPLORER_ROW_INPUT_CLASS =
  "h-6 w-full rounded border border-slate-300 bg-white px-1 text-[14px] leading-5 text-[#1f2328] outline-none select-text";

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




