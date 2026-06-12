import "./panel.css";
import { memo } from "react";
import type { AriaRole, CSSProperties, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";

type PanelProps = {
  id?: string;
  x?: number;
  y?: number;
  width?: number | string;
  panelRef?: RefObject<HTMLDivElement | null>;
  style?: CSSProperties;
  className?: string;
  role?: AriaRole;
  ariaLabel?: string;
  preventContextMenu?: boolean;
  children?: ReactNode;
};

const getPanelClassName = (className?: string, isFloating = false): string => ["panel", isFloating ? "panel--floating" : null, className].filter(Boolean).join(" ");
const getPanelStyle = (style?: CSSProperties, x?: number, y?: number, width?: number | string): CSSProperties => ({
  ...style,
  ...(x !== undefined ? { left: x } : {}),
  ...(y !== undefined ? { top: y } : {}),
  ...(width !== undefined ? { width } : {}),
});

const PanelBase = ({ id, x, y, width, panelRef, style, className, role, ariaLabel, preventContextMenu = false, children }: PanelProps) => {
  const isFloating = x !== undefined || y !== undefined;
  const handleContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!preventContextMenu) return;

    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div id={id} ref={panelRef} className={getPanelClassName(className, isFloating)} role={role} aria-label={ariaLabel} style={getPanelStyle(style, x, y, width)} onContextMenu={preventContextMenu ? handleContextMenu : undefined}>
      {children}
    </div>
  );
};

const Panel = memo(PanelBase);
Panel.displayName = "Panel";

export { Panel };
export type { PanelProps };
