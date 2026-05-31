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

let rightClickPanelMeasureCanvas: HTMLCanvasElement | null = null;

export const RIGHT_CLICK_PANEL_STYLE = `
.right-click-panel {
  box-sizing: border-box;
  contain: layout paint style;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: ${RIGHT_CLICK_PANEL_SURFACE_PADDING}px;
  overflow: hidden;
  background: #ffffff;
  border: ${RIGHT_CLICK_PANEL_SURFACE_BORDER_WIDTH}px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14), 0 1px 6px rgba(0, 0, 0, 0.08);
  font-family: ${RIGHT_CLICK_PANEL_FONT_FAMILY};
  font-variant-east-asian: proportional-width;
  font-feature-settings: "palt" 1;
  animation: none;
  transition: none;
  transform: none;
}

.right-click-panel,
.right-click-panel * {
  box-sizing: border-box;
}

.right-click-panel-item,
.right-click-panel-title {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: ${RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT}px;
  padding: 0 ${RIGHT_CLICK_PANEL_ITEM_HORIZONTAL_PADDING}px;
  border: 0;
  border-radius: 4px;
  color: #4a4a4a;
  font-family: ${RIGHT_CLICK_PANEL_FONT_FAMILY};
  font-size: ${RIGHT_CLICK_PANEL_TEXT_FONT_SIZE}px;
  font-weight: 400;
  line-height: 15px;
  letter-spacing: 0;
  text-align: left;
  white-space: nowrap;
  -webkit-font-smoothing: antialiased;
  animation: none;
}

.right-click-panel-item {
  background: transparent;
  transition: background-color 80ms linear;
}

.right-click-panel-item:not(:disabled) {
  cursor: default;
}

.right-click-panel-item:not(:disabled):hover,
.right-click-panel-item:not(:disabled):focus-visible {
  background: #eeeeee;
  outline: none;
}

.right-click-panel-item:disabled {
  color: #b8b8b8;
  cursor: default;
}

.right-click-panel-title {
  background: transparent;
}
`;

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

    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(RIGHT_CLICK_PANEL_OPEN_EVENT, handleOtherPanelOpen);
    window.addEventListener("resize", onClose, { once: true });
    window.addEventListener("scroll", onClose, {
      capture: true,
      once: true,
    });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(RIGHT_CLICK_PANEL_OPEN_EVENT, handleOtherPanelOpen);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, { capture: true });
    };
  }, [isOpen, onClose, panelId, panelRef]);
};
