import { isDesktopRuntime } from "@/platform/runtime";

export const useIsDesktopRuntime = () => {
  return isDesktopRuntime();
};
