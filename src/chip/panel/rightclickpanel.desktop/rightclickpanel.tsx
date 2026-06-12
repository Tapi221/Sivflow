import "./rightclickpanel.css";
import { memo } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import { Panel } from "../panel";

type RightClickPanelProps = {
  id?: string;
  x: number;
  y: number;
  width: number | string;
  panelRef: RefObject<HTMLDivElement | null>;
  style?: CSSProperties;
  className?: string;
  ariaLabel?: string;
  children?: ReactNode;
};

const getRightClickPanelClassName = (className?: string): string => ["right-click-panel", className].filter(Boolean).join(" ");
const getRightClickPanelStyle = (style: CSSProperties | undefined, x: number, y: number, width: number | string): CSSProperties => ({
  ...style,
  left: x,
  top: y,
  width,
});

const RightClickPanelBase = ({ id, x, y, width, panelRef, style, className, ariaLabel, children }: RightClickPanelProps) => {
  const handleContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return <Panel id={id} panelRef={panelRef} className={getRightClickPanelClassName(className)} role="menu" ariaLabel={ariaLabel} style={getRightClickPanelStyle(style, x, y, width)} onContextMenu={handleContextMenu}>{children}</Panel>;
};

const RightClickPanel = memo(RightClickPanelBase);
RightClickPanel.displayName = "RightClickPanel";

export { RightClickPanel };
export type { RightClickPanelProps };
