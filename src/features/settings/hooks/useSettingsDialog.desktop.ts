import { useState } from "react";

export const useSettingsDialogDesktop = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return {
    isSettingsOpen,

    setIsSettingsOpen,

    openSettings: () => {
      setIsSettingsOpen(true);
    },

    closeSettings: () => {
      setIsSettingsOpen(false);
    },
  };
};
