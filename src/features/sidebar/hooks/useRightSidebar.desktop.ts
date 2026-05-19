import { useState } from "react";

export const useRightSidebarDesktop = () => {
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  return {
    isRightSidebarOpen,

    setIsRightSidebarOpen,

    openRightSidebar: () => {
      setIsRightSidebarOpen(true);
    },

    closeRightSidebar: () => {
      setIsRightSidebarOpen(false);
    },

    toggleRightSidebar: () => {
      setIsRightSidebarOpen((current) => !current);
    },
  };
};
