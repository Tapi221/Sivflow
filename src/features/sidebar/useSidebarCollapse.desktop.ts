import { useEffect, useState } from "react";

const SIDEBAR_COLLAPSE_STORAGE_KEY = "mf.ui.sidebarCollapsed";

export const useSidebarCollapseDesktop = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY);

      return stored === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSE_STORAGE_KEY,
        isSidebarCollapsed ? "1" : "0",
      );
    } catch {
      // ignore
    }
  }, [isSidebarCollapsed]);

  return {
    isSidebarCollapsed,

    setIsSidebarCollapsed,

    toggleSidebarCollapsed: () => {
      setIsSidebarCollapsed((current) => !current);
    },
  };
};
