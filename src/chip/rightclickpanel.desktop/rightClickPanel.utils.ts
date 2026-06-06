import { useEffect, type CSSProperties, type RefObject } from "react";

export type RightClickPanelPosition = {
  x: number;
  y: number;
};

export type RightClickPanelNoDragStyle = CSSProperties & {
  WebkitAppRegion?: "drag" | "no-drag";
};

export type RightClickPanelDimensions = {
  width: number;
  height: number;
};

export type RightClickPanelId = string;

type RightClickPanelDismissIgnoredRef = RefObject<Element | null>;

type RightClickPanelDismissOptions = {
  closeOnScroll?: boolean;
  ignoredRefs?: readonly RightClickPanelDismissIgnoredRef[];
};

type RightClickPanelOpenEventDetail = {
  panelId: RightClickPanelId;
};

export const RIGHT_CLICK_PANEL_MARGIN = 8;
export const RIGHT_CLICK_PANEL_SURFACE_PADDING = 2;
export const RIGHT_CLICK_PANEL_SURFACE_BORDER_WIDTH = 1;
export const RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE = RIGHT_CLICK_PANEL_SURFACE_PADDING * 2 + RIGHT_CLICK_PANEL_SURFACE_BORDER_WIDTH * 2;
export const RIGHT_CLICK_PANEL_ITEM_HORIZONTAL_PADDING = 10;
export const RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT = 26;
export const RIGHT_CLICK_PANEL_TEXT_FONT_SIZE = 13;
export const RIGHT_CLICK_PANEL_OPEN_EVENT = "manifolia:right-click-panel-open";

export const RIGHT_CLICK_PANEL_NO_DRAG_STYLE: RightClickPanelNoDragStyle = {
  WebkitAppRegion: "no-drag",
};

export const RIGHT_CLICK_PANEL_FONT_FAMILY =
  "var(--explorer-chrome-font-family, \"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, BlinkMacSystemFont, \"Yu Gothic UI\", \"Hiragino Sans\", sans-serif)";

const RIGHT_CLICK_PANEL_MEASURE_FONT_FAMILY =
  "\"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, BlinkMacSystemFont, \"Yu Gothic UI\", \"Hiragino Sans\", sans-serif";

const RIGHT_CLICK_PANEL_MEASURE_FONT = `400 ${RIGHT_CLICK_PANEL_TEXT_FONT_SIZE}px ${RIGHT_CLICK_PANEL_MEASURE_FONT_FAMILY}`;
const EMPTY_RIGHT_CLICK_PANEL_DISMISS_REFS: readonly RightClickPanelDismissIgnoredRef[] = [];
const EMPTY_RIGHT_CLICK_PANEL_DISMISS_OPTIONS: RightClickPanelDismissOptions = {};
const RIGHT_CLICK_PANEL_MOBILE_BREAKPOINT_PX = 640;
const RIGHT_CLICK_PANEL_MOBILE_MARGIN = 24;
const RIGHT_CLICK_PANEL_MOBILE_MIN_WIDTH = 342;
const RIGHT_CLICK_PANEL_MOBILE_ROW_HEIGHT = 66;
const RIGHT_CLICK_PANEL_MOBILE_VERTICAL_EDGE = 0;

let rightClickPanelMeasureCanvas: HTMLCanvasElement | null = null;

export const RIGHT_CLICK_PANEL_STYLE = `
.right-click-panel {
  box-sizing: border-box;
  contain