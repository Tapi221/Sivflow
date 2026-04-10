import { useCallback, useEffect } from "react";

type Params = {
  isDesktop: boolean;
};

export const useWorkspaceScrollController = ({ isDesktop }: Params) => {
  const resetExplorerPaneScroll = useCallback(() => {
    const main = document.querySelector(".app-layout__main");

    if (main instanceof HTMLElement) {
      main.scrollTop = 0;
      main.scrollLeft = 0;
    }

    if (!isDesktop) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [isDesktop]);

  useEffect(() => {
    document.documentElement.classList.toggle("no-page-scroll", isDesktop);

    return () => {
      document.documentElement.classList.remove("no-page-scroll");
    };
  }, [isDesktop]);

  return {
    resetExplorerPaneScroll,
  };
};
