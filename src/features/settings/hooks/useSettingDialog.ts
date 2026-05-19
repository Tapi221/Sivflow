import { useState } from "react";

export type SettingSection = "language";

export const useSettingDialog = () => {
  const [selected, setSelected] = useState<SettingSection>("language");

  return {
    selected,
    setSelected,
  };
};