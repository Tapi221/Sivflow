import { useCallback } from "react";



type Params = {
  isDesktop: boolean;
};



/**
 * Explorer 内の選択変更に伴う main pane のスクロールだけを担当する。
 * route 遷移時の全体スクロール reset / no-page-scroll の制御は AppLayout 側に残す。
 */
const useWorkspaceScrollController = ({ isDesktop }: Params) => {
  const resetExplorerPaneScroll = useCallback(() => {
    if (typeof document === "undefined") return;

    const main = document.querySelector(".app-layout__main");

    if (main instanceof HTMLElement) {
      main.scrollTop = 0;
      main.scrollLeft = 0;
    }

    if (!isDesktop && typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [isDesktop]);

  return {
    resetExplorerPaneScroll,
  };
};



export { useWorkspaceScrollController };
