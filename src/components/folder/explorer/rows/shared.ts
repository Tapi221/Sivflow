const EXPLORER_ROW_BASE_CLASS_NAME = "sidebar-row ds-list-item group box-border py-0 relative w-full text-left";
const EXPLORER_ENTITY_ROW_INTERACTIVE_CLASS = "sidebar-row--folder ds-list-item--interactive";
const EXPLORER_ENTITY_ROW_SHELL_BASE_CLASS = "relative flex w-full cursor-pointer items-center rounded-lg px-2";
const EXPLORER_ENTITY_ROW_DENSITY_COMPACT_CLASS = "h-7";
const EXPLORER_ROW_CONTENT_CLASS = "ds-list-item__content flex h-full min-w-0 flex-1 items-center pr-1";
const EXPLORER_ROW_LEADING_SLOT_CLASS = "sidebar-action flex h-full w-5 shrink-0 items-center justify-center";
const EXPLORER_ROW_ICON_SLOT_CLASS = "ds-list-item__icon flex h-full w-5 shrink-0 items-center justify-center";
const EXPLORER_ROW_INPUT_CLASS = "ds-list-item__input h-5 w-full px-1 text-xs leading-5 outline-none select-text";
const EXPLORER_ROW_TITLE_SLOT_CLASS = "pointer-events-none flex min-w-0 flex-1 items-center";
const EXPLORER_ROW_MOBILE_NAV_TRAILING_PADDING_CLASS = "pr-8 md:pr-0";
const FOLDER_ROW_HEIGHT_PX = 30;
const FOLDER_ROW_ICON_SIZE_CLASS = "h-4 w-4";
const FOLDER_ROW_TITLE_CLASS = "ds-list-item__title truncate text-sm font-normal";
const FOLDER_ROW_ICON_MUTED_CLASS = "ds-list-item__icon";
const FOLDER_ROW_ICON_ACTIVE_CLASS = "text-[var(--ds-semantic-color-text-primary)]";



const getExplorerRowStyle = (depth: number) => ({ paddingLeft: `calc(12px + ${depth} * var(--tree-indent-px))`, height: `${FOLDER_ROW_HEIGHT_PX}px`, minHeight: `${FOLDER_ROW_HEIGHT_PX}px`, lineHeight: `${FOLDER_ROW_HEIGHT_PX}px`, boxSizing: "border-box" as const });



export { EXPLORER_ROW_BASE_CLASS_NAME, EXPLORER_ENTITY_ROW_INTERACTIVE_CLASS, EXPLORER_ENTITY_ROW_SHELL_BASE_CLASS, EXPLORER_ENTITY_ROW_DENSITY_COMPACT_CLASS, EXPLORER_ROW_CONTENT_CLASS, EXPLORER_ROW_LEADING_SLOT_CLASS, EXPLORER_ROW_ICON_SLOT_CLASS, EXPLORER_ROW_INPUT_CLASS, EXPLORER_ROW_TITLE_SLOT_CLASS, EXPLORER_ROW_MOBILE_NAV_TRAILING_PADDING_CLASS, FOLDER_ROW_HEIGHT_PX, FOLDER_ROW_ICON_SIZE_CLASS, FOLDER_ROW_TITLE_CLASS, FOLDER_ROW_ICON_MUTED_CLASS, FOLDER_ROW_ICON_ACTIVE_CLASS, getExplorerRowStyle };
