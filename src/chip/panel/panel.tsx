import "./panel.css";
import { memo } from "react";
import type { AriaRole, CSSProperties, ReactNode, RefObject } from "react";

type PanelProps = {
  id?: string;
  panelRef?: RefObject<HTMLDivElement | null>;
  style?: CSSProperties;
  className?: string;
  role?: AriaRole;
  ariaLabel?: string;
  children?: ReactNode;
};

const getPanelClassName = (className?: string): string => ["panel", className].filter(Boolean).join(" ");

const PanelBase = ({ id, panelRef, style, className, role, ariaLabel, children }: PanelProps) => {
  return (
    <div id={id} ref={panelRef} className={getPanelClassName(className)} role={role} aria-label={ariaLabel} style={style}>
      {children}
    </div>
  );
};

const Panel = memo(PanelBase);
Panel.displayName = "Panel";

export { Panel };
export type { PanelProps };
