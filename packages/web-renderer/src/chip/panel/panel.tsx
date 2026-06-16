import "./Surface.Panel.css";
import "./panel.css";
import { memo } from "react";
import type { AriaRole, CSSProperties, MouseEventHandler, ReactNode, RefObject } from "react";



type PanelProps = {
  id?: string;
  panelRef?: RefObject<HTMLDivElement | null>;
  style?: CSSProperties;
  className?: string;
  role?: AriaRole;
  ariaLabel?: string;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
  children?: ReactNode;
};



const getPanelClassName = (className?: string): string => ["panel", "surface-panel", className].filter(Boolean).join(" ");



const PanelBase = ({ id, panelRef, style, className, role, ariaLabel, onContextMenu, children }: PanelProps) => {
  return (
    <div id={id} ref={panelRef} className={getPanelClassName(className)} role={role} aria-label={ariaLabel} style={style} onContextMenu={onContextMenu}>
      {children}
    </div>
  );
};



const Panel = memo(PanelBase);
Panel.displayName = "Panel";

export { Panel };


export type { PanelProps };
