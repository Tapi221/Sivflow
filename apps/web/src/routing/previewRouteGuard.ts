import { DEV_MODE, isLocalHost } from "@/utils/envGuards";



const isPreviewRouteEnabled = () => {
  const hasPreviewParam = new URLSearchParams(window.location.search).get("preview_route") === "true";
  if (!hasPreviewParam) {
    return false;
  }
  if (!DEV_MODE) {
    return false;
  }
  return isLocalHost(window.location.hostname);
};



export { isPreviewRouteEnabled };
