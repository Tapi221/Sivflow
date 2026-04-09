export const useWorkspaceScrollController = () => {
  return {
    resetExplorerPaneScroll: () => {
      const main = document.querySelector(".app-layout__main");
      if (main instanceof HTMLElement) {
        main.scrollTop = 0;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    },
    lockPageScroll: (locked: boolean) => {
      document.documentElement.classList.toggle("no-page-scroll", locked);
    },
  };
};
