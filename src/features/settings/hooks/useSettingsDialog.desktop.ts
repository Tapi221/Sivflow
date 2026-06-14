import { useState } from "react";



const useSettingsDialogDesktop = () => {
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



export { useSettingsDialogDesktop };
