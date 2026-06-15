import { hasDesktopBridge, hasDesktopRuntime } from "@platform/detectDesktopBridge";

const isDesktopRuntime = (): boolean => hasDesktopRuntime();

export { hasDesktopBridge, hasDesktopRuntime, isDesktopRuntime };
