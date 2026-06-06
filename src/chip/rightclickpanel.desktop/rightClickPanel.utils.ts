import { useEffect, type CSSProperties, type RefObject } from "react";

export type RightClickPanelPosition = { x: number; y: number };
export type RightClickPanelNoDragStyle = CSSProperties & { WebkitAppRegion?: "drag" | "no-drag" };
export type RightClickPanelDimensions = { width: number; height: number };
export type RightClickPanelId = string;

export const RIGHT_CLICK_PANEL_MARGIN = 8;
export const RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT = 28;
export const RIGHT_CLICK_PANEL_SURFACE_PADDING = 4;
export const RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE = RIGHT_CLICK_PANEL_SURFACE_PADDING * 2;
export const RIGHT_CLICK_PANEL_OPEN_EVENT = "open";
export const RIGHT_CLICK_PANEL_NO_DRAG_STYLE: RightClickPanelNoDragStyle = { WebkitAppRegion: "no-drag" };

const RIGHT_CLICK_PANEL_MIN_WIDTH = 112;
const RIGHT_CLICK_PANEL_TEXT_HORIZONTAL_EDGE = 32