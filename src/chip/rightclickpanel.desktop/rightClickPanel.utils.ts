import { type CSSProperties } from "react";

export type RightClickPanelPosition = { x: number; y: number };
export type RightClickPanelNoDragStyle = CSSProperties & { WebkitAppRegion?: "drag" | "no-drag" };
export type RightClickPanelDimensions = { width: number; height: number };
export type RightClickPanelId = string;

export const RIGHT_CLICK_PANEL_MARGIN = 8;
export const RIGHT_CLICK_PANEL_OPEN_EVENT = "