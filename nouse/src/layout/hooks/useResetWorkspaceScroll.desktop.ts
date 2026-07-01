import { useLayoutEffect } from "react";
import type { RefObject } from "react";



type WorkspaceScrollRef = RefObject<HTMLElement | null> | undefined;



const resetWorkspaceScrollPosition = (mainRef: WorkspaceScrollRef) => {
  const containers = document.querySelectorAll<HTMLElement>(
    ".app-layout, .app-layout__content, .app-layout__main",
  );

  containers.forEach((element) => {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  });

  const mainElement = mainRef?.current ?? null;

  if (mainElement) {
    mainElement.scrollTop = 0;
    mainElement.scrollLeft = 0;
  }

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto",
  });

  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};
const useResetWorkspaceScrollDesktop = (mainRef: WorkspaceScrollRef, pathname: string) => {
  useLayoutEffect(() => {
    resetWorkspaceScrollPosition(mainRef);

    const animationFrameId = window.requestAnimationFrame(() => {
      resetWorkspaceScrollPosition(mainRef);
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [mainRef, pathname]);
};



export { useResetWorkspaceScrollDesktop };
