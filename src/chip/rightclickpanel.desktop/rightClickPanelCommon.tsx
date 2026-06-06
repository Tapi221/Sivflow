import { memo, type CSSProperties, type ReactNode, type RefObject } from "react";
import { RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_SURFACE_PADDING, type RightClickPanelId } from "./rightClickPanel.utils";

type RightClickPanelSurfaceProps = {
  x: number;
  y: number;
  width: number;
  panelRef: RefObject<HTMLDivElement | null>;
  noDragStyle?: CSSProperties;
  className?: string;
  role?: string;
  ariaLabel?: string;
  panelId?: RightClickPanelId;
  children?: ReactNode;
};

const RIGHT_CLICK_PANEL_COMMON_STYLE = `
.right-click-panel {
  position: fixed;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: ${RIGHT_CLICK_PANEL_SURFACE_PADDING}px;
  border: 1px solid rgba(0, 0, 0, 0