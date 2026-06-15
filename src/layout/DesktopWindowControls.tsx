import "./DesktopWindowControls.css";
import { useEffect, useState } from "react";
import { hasDesktopBridge } from "@platform/runtime";
import type { CSSProperties, MouseEvent } from "react";
import { windowControls } from "@/platform/capabilities/windowControls";



type AppRegionStyle = CSSProperties & {
  WebkitAppRegion?: "no-drag";
};
type WindowControlAction = () => Promise<void>;



const NO_DRAG_STYLE: AppRegionStyle = {
  WebkitAppRegion: "no-drag",
};



const runWindowAction = (action: WindowControlAction) => {
  void action().catch((error) => {
    console.error("[desktop-window-controls] window action failed", error);
  });
};
const handleClickWindowAction = (
  event: MouseEvent<HTMLButtonElement>,
  action: WindowControlAction,
) => {
  event.preventDefault();
  event.stopPropagation();
  runWindowAction(action);
};



const DesktopWindowControls = () => {
  const isDesktop = hasDesktopBridge();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isDesktop) {
      return;
    }

    let isMounted = true;

    void windowControls.isMaximized().then((nextIsMaximized) => {
      if (isMounted) {
        setIsMaximized(nextIsMaximized);
      }
    });

    const unsubscribe = windowControls.onMaximizedStateChange(setIsMaximized);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isDesktop]);

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
        onClick={(event) =>
          handleClickWindowAction(event, windowControls.minimize)
        }
      >
        <span className="desktop-window-controls__minimize" aria-hidden />
      </button>
      <button
        type="button"
        className="desktop-window-controls__button"
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
        title={isMaximized ? "Restore" : "Maximize"}
        onClick={(event) =>
          handleClickWindowAction(event, windowControls.maximizeToggle)
        }
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
        onClick={(event) =>
          handleClickWindowAction(event, windowControls.close)
        }
      >
        <span className="desktop-window-controls__close" aria-hidden />
      </button>
    </div>
  );
};



export { DesktopWindowControls };
