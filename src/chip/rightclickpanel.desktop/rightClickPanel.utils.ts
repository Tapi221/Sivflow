import { useEffect, type CSSProperties, type RefObject } from "react";

export type RightClickPanelPosition = { x: number; y: number };
export type RightClickPanelNoDragStyle = CSSProperties & { WebkitAppRegion?: "drag" | "no-drag" };
export type RightClickPanelDimensions = { width: number; height: number };
export type RightClickPanelId = string;

type RightClickPanelDismissOptions = { closeOnScroll?: boolean; ignoredRefs?: readonly RefObject<Element | null>[] };

export const RIGHT_CLICK_PANEL_MARGIN = 8;
export const RIGHT_CLICK_PANEL_OPEN_EVENT = "manifolia:right-click-panel-open";
export const RIGHT_CLICK_PANEL_STYLE = ".right-click-panel{box-sizing:border-box;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:8px;padding:2px}.right-click-panel-item,.right-click-panel-title{display:flex;align-items:center;width:100%;min-height:26px;padding:0 10px;border:0;border-radius:4px;font-size:13px;white-space:nowrap}.right-click-panel-item:hover{background:#eee}";
export const RIGHT_CLICK_PANEL_NO_DRAG_STYLE: RightClickPanelNoDragStyle = { WebkitAppRegion: "