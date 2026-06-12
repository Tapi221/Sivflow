import { useEffect } from "react";
import type { CSSProperties, RefObject } from "react";

type RightClickPanelPosition = {
  x: number; y: number; };
type RightClickPanelNoDragStyle = CSSProperties & { WebkitAppRegion?: "drag" | "no-drag"; };
type RightClickPanelDimensions = {
  width: number; height: number; };
type RightClickPanelId = string;

const RIGHT_CLICK_PANEL_MARGIN = 8;
const RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT = 28;
const RIGHT_CLICK_PANEL_SURFACE_PADDING = 4;
const RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE = RIGHT_CLICK_PANEL_SURFACE_PADDING * 2;
const RIGHT_CLICK_PANEL_OPEN_EVENT = "open";
const RIGHT_CLICK_PANEL_NO_DRAG_STYLE: RightClickPanelNoDragStyle = { WebkitAppRegion: "no-drag" };
const RIGHT_CLICK_PANEL_MIN_WIDTH = 112;
const RIGHT_CLICK_PANEL_TEXT_HORIZONTAL_EDGE = 32;
const RIGHT_CLICK_PANEL_FALLBACK_TEXT_WIDTH = 8;
const RIGHT_CLICK_PANEL_FONT = "13px system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif";
let rightClickPanelMeasureContext: CanvasRenderingContext2D | null | undefined;

const getRightClickPanelMeasureContext = (): CanvasRenderingContext2D | null => {
  if (rightClickPanelMeasureContext !== undefined) return rightClickPanelMeasureContext;
  if (typeof document === "undefined") {
    rightClickPanelMeasureContext = null;
    return rightClickPanelMeasureContext;
  }

  rightClickPanelMeasureContext = document.createElement("canvas").getContext("2d");
  return rightClickPanelMeasureContext;
};
const measureRightClickPanelTextWidth = (text: string): number => {
  const context = getRightClickPanelMeasureContext();
  if (!context) return text.length * RIGHT_CLICK_PANEL_FALLBACK_TEXT_WIDTH;

  context.font = RIGHT_CLICK_PANEL_FONT;
  return context.measureText(text).width;
};
const resolveRightClickPanelTextWidth = (labels: readonly string[], minimumWidth = RIGHT_CLICK_PANEL_MIN_WIDTH): number => {
  const textWidth = labels.reduce((maxWidth, label) => Math.max(maxWidth, measureRightClickPanelTextWidth(label)), 0);
  return Math.ceil(Math.max(RIGHT_CLICK_PANEL_MIN_WIDTH, minimumWidth, textWidth + RIGHT_CLICK_PANEL_TEXT_HORIZONTAL_EDGE));
};
const clampRightClickPanelAxis = (value: number, size: number, viewportSize: number): number => {
  const min = RIGHT_CLICK_PANEL_MARGIN;
  const max = Math.max(min, viewportSize - size - RIGHT_CLICK_PANEL_MARGIN);
  return Math.min(Math.max(value, min), max);
};
const clampRightClickPanelPosition = (x: number, y: number, dimensions: RightClickPanelDimensions): RightClickPanelPosition => {
  if (typeof window === "undefined") return { x, y };

  return {
    x: clampRightClickPanelAxis(x, dimensions.width, window.innerWidth),
    y: clampRightClickPanelAxis(y, dimensions.height, window.innerHeight),
  };
};
const useRightClickPanelDismiss = (panelId: RightClickPanelId, isOpen: boolean, panelRef: RefObject<HTMLElement | null>, onDismiss: () => void): void => {
  useEffect(() => {
    if (!isOpen) return;

    const isPanelEvent = (event: Event): boolean => {
      const panel = panelRef.current;
      return panel !== null && event.target instanceof Node && panel.contains(event.target);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (isPanelEvent(event)) return;
      onDismiss();
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (isPanelEvent(event)) return;
      onDismiss();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onDismiss();
    };

    const handleOpenPanel = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      if (event.detail?.panelId === panelId) return;
      onDismiss();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener(RIGHT_CLICK_PANEL_OPEN_EVENT, handleOpenPanel);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener(RIGHT_CLICK_PANEL_OPEN_EVENT, handleOpenPanel);
    };
  }, [isOpen, onDismiss, panelId, panelRef]);
};

export { RIGHT_CLICK_PANEL_MARGIN, RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_SURFACE_PADDING, RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE, RIGHT_CLICK_PANEL_OPEN_EVENT, RIGHT_CLICK_PANEL_NO_DRAG_STYLE, resolveRightClickPanelTextWidth, clampRightClickPanelPosition, useRightClickPanelDismiss };
export type { RightClickPanelPosition, RightClickPanelNoDragStyle, RightClickPanelDimensions, RightClickPanelId };
