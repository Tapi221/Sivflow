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
export const RIGHT_CLICK_PANEL