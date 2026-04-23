import type { PresentationTarget } from "./getPresentationTarget";

export const APP_DESKTOP_TOP_INSET_PX = 44;

export const getAppTopInsetPx = ({
  presentationTarget,
}: {
  presentationTarget: PresentationTarget;
}): number => {
  if (presentationTarget === "desktop") {
    return APP_DESKTOP_TOP_INSET_PX;
  }

  return 0;
};
