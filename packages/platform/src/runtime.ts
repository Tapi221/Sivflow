import { hasDesktopBridge, hasDesktopRuntime } from "./detectDesktopBridge";



const isDesktopRuntime = (): boolean => hasDesktopRuntime();



export { hasDesktopBridge, hasDesktopRuntime, isDesktopRuntime };
