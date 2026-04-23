export const EXPLORER_ROW_BASE_CLASS_NAME =
  "sidebar-row ds-list-item group box-border py-0 relative w-full text-left";
export const EXPLORER_ENTITY_ROW_INTERACTIVE_CLASS =
  "sidebar-row--folder ds-list-item--interactive";
export const EXPLORER_ENTITY_ROW_SHELL_BASE_CLASS =
  "relative flex w-full cursor-pointer items-center rounded-[8px] px-2";
export const EXPLORER_ENTITY_ROW_DENSITY_COMPACT_CLASS = "h-[28px]";
export const EXPLORER_ROW_CONTENT_CLASS =
  "ds-list-item__content flex h-full min-w-0 flex-1 items-center pr-1";
export const EXPLORER_ROW_LEADING_SLOT_CLASS =
  "sidebar-action flex h-full w-4 shrink-0 items-center justify-center";
export const EXPLORER_ROW_ICON_SLOT_CLASS =
  "ds-list-item__icon flex h-full w-4 shrink-0 items-center justify-center";
export const EXPLORER_ROW_INPUT_CLASS =
  "ds-list-item__input h-[22px] w-full px-1 text-[13px] leading-5 outline-none select-text";
export const EXPLORER_ROW_TITLE_SLOT_CLASS =
  "pointer-events-none flex min-w-0 flex-1 items-center";
export const EXPLORER_ROW_MOBILE_NAV_TRAILING_PADDING_CLASS = "pr-8 md:pr-0";

export const FOLDER_ROW_HEIGHT_PX = 28;
export const FOLDER_ROW_ICON_SIZE_CLASS = "h-3.5 w-3.5";
export const FOLDER_ROW_TITLE_CLASS =
  "ds-list-item__title truncate text-[13px] font-normal";
export const FOLDER_ROW_ICON_MUTED_CLASS = "ds-list-item__icon";
export const FOLDER_ROW_ICON_ACTIVE_CLASS =
  "text-[var(--ds-semantic-color-text-primary)]";

export const getExplorerRowStyle = (depth: number) => ({
  paddingLeft: `calc(6px + ${depth} * var(--tree-indent-px))`,
  height: `${FOLDER_ROW_HEIGHT_PX}px`,
  minHeight: `${FOLDER_ROW_HEIGHT_PX}px`,
  lineHeight: `${FOLDER_ROW_HEIGHT_PX}px`,
  boxSizing: "border-box" as const,
});
