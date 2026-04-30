import { useEffect, useState, type CSSProperties } from "react";

import { windowControls } from "@/platform/capabilities/windowControls";
import { hasDesktopBridge } from "@/platform/runtime";

type AppRegionStyle = CSSProperties & {
  WebkitAppRegion?: "no-drag";
};

const NO_DRAG_STYLE: AppRegionStyle = {
  WebkitAppRegion: "no-drag",
};

const runWindowAction = (action: () => Promise<void>) => {
  void action();
};

export const DesktopWindowControls = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!hasDesktopBridge()) {
      return;
    }

    setIsDesktop(true);

    let isMounted = true;

    void windowControls.isMaximized().then((nextIsMaximized) => {
      if (isMounted) {
        setIsMaximized(nextIsMaximized);
      }
    });

    const unsubscribe = windowControls.onMaximizedStateChange(
      setIsMaximized,
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (!isDesktop) {
    return null;
  }

  return (
    <div
      className="desktop-window-controls"
      style={NO_DRAG_STYLE}
      aria-label="Window controls"
    >
      <button
        type="button"
        className="desktop-window-controls__button"
        aria-label="Minimize window"
        title="Minimize"
        onClick={() => runWindowAction(windowControls.minimize)}
      >
        <span className="desktop-window-controls__minimize" aria-hidden />
      </button>

      <button
        type="button"
        className="desktop-window-controls__button"
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
        title={isMaximized ? "Restore" : "Maximize"}
        onClick={() => runWindowAction(windowControls.maximizeToggle)}
      >
        <span
          className={
            isMaximized
              ? "desktop-window-controls__restore"
              : "desktop-window-controls__maximize"
          }
          aria-hidden
        />
      </button>

      <button
        type="button"
        className="desktop-window-controls__button desktop-window-controls__button--close"
        aria-label="Close window"
        title="Close"
        onClick={() => runWindowAction(windowControls.close)}
      >
        <span className="desktop-window-controls__close" aria-hidden />
      </button>
    </div>
  );
};
