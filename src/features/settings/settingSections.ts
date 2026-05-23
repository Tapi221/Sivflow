import { SettingSection } from "./hooks/useSettingDialog";

export const settingSections: {
  key: SettingSection;
  label: string;
}[] = [
  { key: "language", label: "言語" },
  { key: "openai", label: "AI設定" },
];