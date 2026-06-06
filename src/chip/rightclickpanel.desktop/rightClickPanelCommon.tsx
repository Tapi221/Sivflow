import type { CSSProperties, ReactNode, RefObject } from "react";
import type { RightClickPanelId } from "./rightClickPanel.utils";

type RightClickPanelSurfaceProps = {
  x: number;
  y: number;
  width: number;
  panelRef: RefObject<HTMLDivElement | null>;
  noDragStyle?: CSSProperties;
  className?: string;
  role?: string;
  ariaLabel: string;
  panelId?: RightClickPanelId;
  children: ReactNode;
};

const RightClickPanelSurface = ({ x, y, width, panelRef, noDragStyle, className, role = "menu", ariaLabel, children }: RightClickPanelSurfaceProps) => (
  <div
    ref={panelRef}
    style={{ ...noDragStyle, position: "fixed", left: x, top: y, zIndex: 1000, width, minWidth: width, maxWidth: width, animation: "none", transition: "none", transform: "none" }}
    className={["right-click-panel", className].filter(Boolean).join(" ")}
    role={role}
    aria-label={ariaLabel}