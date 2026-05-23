import { useState } from "react";

export type SettingSection = "language" | "openai";

export const useSettingDialog = () => {
  const [selected, setSelected] = useState<SettingSection>("language");

  return {
    selected,
    setSelected,
  };
};