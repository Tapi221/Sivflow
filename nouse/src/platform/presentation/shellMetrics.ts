import type { PresentationTarget } from "./getPresentationTarget";



const APP_DESKTOP_TOP_INSET_PX = 44;



const getAppTopInsetPx = ({ presentationTarget }: { presentationTarget: PresentationTarget;
}): number => {
  if (presentationTarget === "desktop") {
    return APP_DESKTOP_TOP_INSET_PX;
  }

  return 0;
};



export { APP_DESKTOP_TOP_INSET_PX, getAppTopInsetPx };
