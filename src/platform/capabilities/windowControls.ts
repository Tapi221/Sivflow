import type { WindowControlsPort } from "@/application/ports/WindowControlsPort";
import platform from "@/platform";

export const windowControls: WindowControlsPort = {
  minimize: () => platform.window.minimize(),
  maximizeToggle: () => platform.window.maximizeToggle(),
  close: () => platform.window.close(),
  isMaximized: () => platform.window.isMaximized(),
  onMaximizedStateChange: (handler: (isMaximized: boolean) => void) =>
    platform.window.onMaximizedStateChange(handler),
};
