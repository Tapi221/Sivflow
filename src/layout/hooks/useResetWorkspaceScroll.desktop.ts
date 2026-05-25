import { useLayoutEffect } from "react";

type Params = {
  pathname: string;
  mainRef: React.RefObject<HTMLElement | null>;
};

const resetWorkspaceScrollPosition = (mainRef: React.RefObject<HTMLElement | null>) => {
  const containers = document.querySelectorAll<HTMLElement>(
    ".app-layout, .app-layout__content, .app-layout__main",
  );

  containers.forEach((element) => {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  });

  if (mainRef.current) {
    mainRef.current.scrollTop = 0;
    mainRef.current.scrollLeft = 0;
  }

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto",
  });

  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

export const useResetWorkspaceScrollDesktop = ({
  pathname,
  mainRef,
}: Params) => {
  useLayoutEffect(() => {
    resetWorkspaceScrollPosition(mainRef);

    const animationFrameId = window.requestAnimationFrame(() => {
      resetWorkspaceScrollPosition(mainRef);
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [pathname, mainRef]);
};
