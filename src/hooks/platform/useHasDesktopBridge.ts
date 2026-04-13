import { hasDesktopBridge } from "@/platform/runtime";

export const useHasDesktopBridge = () => {
  return hasDesktopBridge();
};