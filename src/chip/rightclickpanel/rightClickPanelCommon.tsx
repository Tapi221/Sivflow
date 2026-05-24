import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

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

export const RIGHT_CLICK_PANEL_WIDTH = 176;
export const RIGHT_CLICK_PANEL_MARGIN = 8;
export const RIGHT_CLICK_PANEL_OPEN_EVENT = "manifolia:right-click-panel-open";

export const RIGHT_CLICK_PANEL_NO_DRAG_STYLE: RightClickPanelNoDragStyle = {
  WebkitAppRegion: "no-drag",
};

export const RIGHT_CLICK_PANEL_FONT_FAMILY =
  "var(--explorer-chrome-font-family, \"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, BlinkMacSystemFont, \"Yu Gothic UI\", \"Hiragino Sans\", sans-serif)";

export const RIGHT_CLICK_PANEL_STYLE = `
.right-click-panel {
  box-sizing: border-box;
  contain: layout paint style;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 3px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
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
  min-height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 4px;
  color: #4a4a4a;
  font-family: ${RIGHT_CLICK_PANEL_FONT_FAMILY};
  font-size: 13px;
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

type RightClickPanelSurfaceProps = {
  x: number;
  y: number;
  width?: number;
  panelRef: RefObject<HTMLDivElement | null>;
  noDragStyle?: CSSProperties;
  className?: string;
  role?: string;
  ariaLabel: string;
  children: ReactNode;
};

export const RightClickPanelSurface = ({
  x,
  y,
  width = RIGHT_CLICK_PANEL_WIDTH,
  panelRef,
  noDragStyle,
  className,
  role = "menu",
  ariaLabel,
  children,
}: RightClickPanelSurfaceProps) => {
  const [position] = useState(() => ({ x, y }));

  return (
    <>
      <style>{RIGHT_CLICK_PANEL_STYLE}</style>
      <div
        ref={panelRef}
        style={{
          ...noDragStyle,
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 1000,
          width,
          minWidth: width,
          maxWidth: width,
          animation: "none",
          transition: "none",
          transform: "none",
        }}
        className={["right-click-panel", className].filter(Boolean).join(" ")}
        role={role}
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </>
  );
};
