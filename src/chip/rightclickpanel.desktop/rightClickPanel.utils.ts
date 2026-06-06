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

type RightClickPanelDismissIgnored