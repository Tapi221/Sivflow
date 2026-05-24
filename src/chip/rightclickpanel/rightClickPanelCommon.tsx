import { useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { RIGHT_CLICK_PANEL_STYLE } from "./rightClickPanelUtils";

type RightClickPanelSurfaceProps = {
  x: number;
  y: number;
  width: number;
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
  width,
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
