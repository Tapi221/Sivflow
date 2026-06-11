import { useEffect, useState } from "react";
import type { PresentationTarget } from "./getPresentationTarget";
import { getPresentationTargetFromWindow } from "./getPresentationTarget";



const bindMediaQueryChange = (
  mediaQueryList: MediaQueryList,
  handler: () => void,
): (() => void) => {
  if (typeof mediaQueryList.addEventListener === "function") {
    mediaQueryList.addEventListener("change", handler);
    return () => {
      mediaQueryList.removeEventListener("change", handler);
    };
  }

  mediaQueryList.addListener(handler);
  return () => {
    mediaQueryList.removeListener(handler);
  };
};
const usePresentationTarget = (): PresentationTarget => {
  const [presentationTarget, setPresentationTarget] = useState<PresentationTarget>(getPresentationTargetFromWindow);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updatePresentationTarget = () => {
      setPresentationTarget(getPresentationTargetFromWindow());
    };

    const hoverQuery = window.matchMedia("(hover: hover)");
    const pointerQuery = window.matchMedia("(pointer: fine)");
    const cleanupHover = bindMediaQueryChange(
      hoverQuery,
      updatePresentationTarget,
    );
    const cleanupPointer = bindMediaQueryChange(
      pointerQuery,
      updatePresentationTarget,
    );

    window.addEventListener("resize", updatePresentationTarget);
    updatePresentationTarget();

    return () => {
      cleanupHover();
      cleanupPointer();
      window.removeEventListener("resize", updatePresentationTarget);
    };
  }, []);

  return presentationTarget;
};



export { usePresentationTarget };
