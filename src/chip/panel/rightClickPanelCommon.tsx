import { memo } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import type { RightClickPanelId } from "./rightclickpanel.desktop/rightClickPanel.utils";
import { RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_SURFACE_PADDING } from "./rightclickpanel.desktop/rightClickPanel.utils";

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
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  contain: layout paint style;
  overflow: hidden;
}

.right-click-panel-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: ${RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT}px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #1f1f1f;
  font: inherit;
  font-size: 13px;
  line-height: 1;
  text-align: left;
  white-space: nowrap;
}

.right-click-panel-item:not(:disabled) {
  cursor: default;
}

.right-click-panel-item:not(:disabled):hover,
.right-click-panel-item:not(:disabled):focus-visible {
  background: #eee;
  outline: none;
}

.right-click-panel-item:disabled {
  color: rgba(0, 0, 0, 0.35);
}
`;

const getRightClickPanelClassName = (className?: string): string => ["right-click-panel", className].filter(Boolean).join(" ");
const getRightClickPanelStyle = (x: number, y: number, width: number, noDragStyle?: CSSProperties): CSSProperties => ({
  ...noDragStyle,
  left: x,
  top: y,
  width,
});

const RightClickPanelSurfaceBase = ({
  x,
  y,
  width,
  panelRef,
  noDragStyle,
  className,
  role = "menu",
  ariaLabel,
  panelId,
  children,
}: RightClickPanelSurfaceProps) => {
  return (
    <>
      <style>{RIGHT_CLICK_PANEL_COMMON_STYLE}</style>
      <div
        id={panelId}
        ref={panelRef}
        className={getRightClickPanelClassName(className)}
        role={role}
        aria-label={ariaLabel}
        style={getRightClickPanelStyle(x, y, width, noDragStyle)}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {children}
      </div>
    </>
  );
};

const RightClickPanelSurface = memo(RightClickPanelSurfaceBase);
RightClickPanelSurface.displayName = "RightClickPanelSurface";

export { RightClickPanelSurface };
