import { hasDesktopBridge } from "./detectDesktopBridge";

export { hasDesktopBridge };

export const isDesktopRuntime = (): boolean => hasDesktopBridge();
