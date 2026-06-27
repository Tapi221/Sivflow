import { hasDesktopBridge } from "@platform/runtime";
import type { WindowControlsPort } from "@/application/ports/WindowControlsPort";
import { getDesktopBridge } from "@/platform/desktop/bridge";



const windowControls: WindowControlsPort = { minimize: async () => {
  const api = getDesktopWindowApi();
  if (!api) return;
  await api.minimize();
},
maximizeToggle: async () => {
  const api = getDesktopWindowApi();
  if (!api) return;
  await api.maximizeToggle();
},
close: async () => {
  const api = getDesktopWindowApi();
  if (!api) return;
  await api.close();
},
isMaximized: async () => {
  const api = getDesktopWindowApi();
  if (!api) return false;
  return api.isMaximized();
},
onMaximizedStateChange: (handler: (isMaximized: boolean) => void) =>
  getDesktopWindowApi()?.onMaximizedStateChange(handler) ??
    (() => {
      // no-op on web
    }),
};



const getDesktopWindowApi = () => {
  if (!hasDesktopBridge()) {
    return null;
  }

  return getDesktopBridge().window;
};



export { windowControls };
