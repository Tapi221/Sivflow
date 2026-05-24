import { useEffect, type RefObject } from "react";
import { RIGHT_CLICK_PANEL_ITEM_HORIZONTAL_PADDING, RIGHT_CLICK_PANEL_MARGIN, RIGHT_CLICK_PANEL_OPEN_EVENT, RIGHT_CLICK_PANEL_SURFACE_PADDING, RIGHT_CLICK_PANEL_TEXT_FONT_SIZE, type RightClickPanelDimensions, type RightClickPanelId, type RightClickPanelNoDragStyle, type RightClickPanelPosition } from "./rightClickPanelCommon";

type RightClickPanelOpenEventDetail = {
  panelId: RightClickPanelId;
};

export const RIGHT_CLICK_PANEL_NO_DRAG_STYLE: RightClickPanelNoDragStyle = {
  WebkitAppRegion: "no-drag",
};

const RIGHT_CLICK_PANEL_MEASURE_FONT_FAMILY =
  "\"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, BlinkMacSystemFont, \"Yu Gothic UI\", \"Hiragino Sans\", sans-serif";

const RIGHT_CLICK_PANEL_MEASURE_FONT = `400 ${RIGHT_CLICK_PANEL_TEXT_FONT_SIZE}px ${RIGHT_CLICK_PANEL_MEASURE_FONT_FAMILY}`;

let rightClickPanelMeasureCanvas: HTMLCanvasElement | null = null;

export const announceRightClickPanelOpen = (panelId: RightClickPanelId) => {
  window.dispatchEvent(
    new CustomEvent<RightClickPanelOpenEventDetail>(RIGHT_CLICK_PANEL_OPEN_EVENT, {
      detail: { panelId },
    }),
  );
};

export const measureRightClickPanelTextWidth = (text: string): number => {
  if (typeof document === "undefined") {
    return [...text].length * RIGHT_CLICK_PANEL_TEXT_FONT_SIZE;
  }

  rightClickPanelMeasureCanvas ??= document.createElement("canvas");
  const context = rightClickPanelMeasureCanvas.getContext("2d");

  if (!context) {
    return [...text].length * RIGHT_CLICK_PANEL_TEXT_FONT_SIZE;
  }

  context.font = RIGHT_CLICK_PANEL_MEASURE_FONT;
  return context.measureText(text).width;
};

export const resolveRightClickPanelTextWidth = (texts: string[], minWidth = 0): number => {
  const maxTextWidth = Math.max(0, ...texts.map((text) => measureRightClickPanelTextWidth(text)));

  return Math.ceil(
    Math.max(
      minWidth,
      maxTextWidth +
        RIGHT_CLICK_PANEL_ITEM_HORIZONTAL_PADDING * 2 +
        RIGHT_CLICK_PANEL_SURFACE_PADDING * 2,
    ),
  );
};

export const clampRightClickPanelPosition = (
  clientX: number,
  clientY: number,
  { width, height }: RightClickPanelDimensions,
): RightClickPanelPosition => {
  const maxX = Math.max(
    RIGHT_CLICK_PANEL_MARGIN,
    window.innerWidth - width - RIGHT_CLICK_PANEL_MARGIN,
  );
  const maxY = Math.max(
    RIGHT_CLICK_PANEL_MARGIN,
    window.innerHeight - height - RIGHT_CLICK_PANEL_MARGIN,
  );

  return {
    x: Math.min(Math.max(clientX, RIGHT_CLICK_PANEL_MARGIN), maxX),
    y: Math.min(Math.max(clientY, RIGHT_CLICK_PANEL_MARGIN), maxY),
  };
};

export const useRightClickPanelDismiss = (
  panelId: RightClickPanelId,
  isOpen: boolean,
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) => {
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.defaultPrevented) return;
      if (panelRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const handleOtherPanelOpen = (event: Event) => {
      const { detail } = event as CustomEvent<RightClickPanelOpenEventDetail>;

      if (detail.panelId !== panelId) {
        onClose();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(RIGHT_CLICK_PANEL_OPEN_EVENT, handleOtherPanelOpen);
    window.addEventListener("resize", onClose, { once: true });
    window.addEventListener("scroll", onClose, {
      capture: true,
      once: true,
    });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(RIGHT_CLICK_PANEL_OPEN_EVENT, handleOtherPanelOpen);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, { capture: true });
    };
  }, [isOpen, onClose, panelId, panelRef]);
};
