import { DEV_MODE, isLocalHost } from "@/utils/envGuards";

export const isTestBypassEnabled = () => {
  const hasBypassParam =
    new URLSearchParams(window.location.search).get("test_bypass") === "true";

  if (!hasBypassParam) {
    return false;
  }

  if (!DEV_MODE) {
    return false;
  }

  return isLocalHost(window.location.hostname);
};