type PresentationTarget = "desktop" | "mobile";
type PresentationCapabilities = {
  viewportWidth: number;
  canHover: boolean;
  hasFinePointer: boolean;
};



const DESKTOP_PRESENTATION_MIN_WIDTH_PX = 1024;



const getPresentationTarget = ({ viewportWidth, canHover, hasFinePointer }: PresentationCapabilities): PresentationTarget => {
  if (viewportWidth >= DESKTOP_PRESENTATION_MIN_WIDTH_PX && canHover && hasFinePointer) {
    return "desktop";
  }

  return "mobile";
};
const getPresentationTargetFromWindow = (): PresentationTarget => {
  if (typeof window === "undefined") {
    return "mobile";
  }

  return getPresentationTarget({
    viewportWidth: window.innerWidth,
    canHover: window.matchMedia("(hover: hover)").matches,
    hasFinePointer: window.matchMedia("(pointer: fine)").matches,
  });
};



export { DESKTOP_PRESENTATION_MIN_WIDTH_PX, getPresentationTarget, getPresentationTargetFromWindow };


export type { PresentationTarget, PresentationCapabilities };
