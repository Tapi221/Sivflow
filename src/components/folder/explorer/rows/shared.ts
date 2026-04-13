export const EXPLORER_ROW_BASE_CLASS_NAME =
  "sidebar-row ds-list-item group box-border py-0 relative w-full text-left";
export const EXPLORER_ROW_CONTENT_CLASS =
  "ds-list-item__content flex h-full min-w-0 flex-1 items-center pr-1";
export const EXPLORER_ROW_LEADING_SLOT_CLASS =
  "sidebar-action flex h-full w-4 shrink-0 items-center justify-center";
export const EXPLORER_ROW_ICON_SLOT_CLASS =
  "ds-list-item__icon flex h-full w-4 shrink-0 items-center justify-center";
export const EXPLORER_ROW_INPUT_CLASS =
  "ds-list-item__input h-6 w-full px-1 text-[14px] leading-5 outline-none select-text";
export const EXPLORER_ROW_TITLE_SLOT_CLASS =
  "pointer-events-none flex min-w-0 flex-1 items-center";
export const EXPLORER_ROW_MOBILE_NAV_TRAILING_PADDING_CLASS = "pr-8 md:pr-0";

export const FOLDER_ROW_HEIGHT_PX = 32;
export const FOLDER_ROW_ICON_SIZE_CLASS = "h-4 w-4";
export const FOLDER_ROW_TITLE_CLASS =
  "ds-list-item__title truncate text-[14px]";
export const FOLDER_ROW_ICON_MUTED_CLASS =
  "ds-list-item__icon";
export const FOLDER_ROW_ICON_ACTIVE_CLASS =
  "text-[var(--ds-semantic-color-text-primary)]";

export const getExplorerRowStyle = (depth: number) => ({
  paddingLeft: `calc(4px + ${depth} * var(--tree-indent-px))`,
  height: "var(--row-height-normal)",
  minHeight: "var(--row-height-normal)",
  lineHeight: "var(--row-height-normal)",
  boxSizing: "border-box" as const,
});
