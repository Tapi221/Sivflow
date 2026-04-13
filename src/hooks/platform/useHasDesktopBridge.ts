import { isDesktopRuntime } from "@/platform/runtime";

export const useHasDesktopBridge = () => {
  return isDesktopRuntime();
};
