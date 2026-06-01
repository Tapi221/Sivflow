import { useLayoutEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { RIGHT_CLICK_PANEL_OPEN_EVENT, RIGHT_CLICK_PANEL_STYLE, announceRightClickPanelOpen, type RightClickPanelId } from "./rightClickPanel.utils";

type RightClickPanelSurfaceProps = {
  x: number;
  y: number;
  width: number;
  panelRef: RefObject<HTMLDivElement | null>;
  noDragStyle?: CSSProperties;
  className?: string;
  role?: string;
  ariaLabel: string;
  panelId?: RightClickPanelId;
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
  panelId,
  children,
}: RightClickPanelSurfaceProps) => {
  const panelInstanceKey = panelId ? `${panelId}:${x}:${y}` : null;
  const [dismissedPanelInstanceKey, setDismissedPanelInstanceKey] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!panelId || !panelInstanceKey) return;

    const handleOtherPanelOpen = (event: Event) => {
      const { detail } = event as CustomEvent<{ panelId?: RightClickPanelId }>;

      if (detail?.panelId !== panelId) {
        setDismissedPanelInstanceKey(panelInstanceKey);
      }
    };
    const isNestedPanel = Boolean(panelRef.current?.parentElement?.closest(".right-click-panel"));

    window.addEventListener(RIGHT_CLICK_PANEL_OPEN_EVENT, handleOtherPanelOpen);
    if (!isNestedPanel) {
      announceRightClickPanelOpen(panelId);
    }

    return () => {
      window.removeEventListener(RIGHT_CLICK_PANEL_OPEN_EVENT, handleOtherPanelOpen);
    };
  }, [panelId, panelInstanceKey, panelRef]);

  if (panelInstanceKey && dismissedPanelInstanceKey === panelInstanceKey) return null;

  return (
    <>
      <style>{RIGHT_CLICK_PANEL_STYLE}</style>
      <div
        ref={panelRef}
        style={{
          ...noDragStyle,
          position: "fixed",
          left: x,
          top: y,
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