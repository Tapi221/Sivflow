import type { ChangeEvent } from "react";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";
import { DEFAULT_THEME_ACCENT_COLOR, normalizeThemeAccentColor } from "@/features/settings/themeAccent";
import type { UserSettings } from "@/types";

type ThemeColorControlCopy = {
  label: string;
  resetLabel: string;
  pickerAriaLabel: string;
};

type SettingsLanguage = UserSettings["language"];

const THEME_COLOR_CONTROL_COPY: Record<SettingsLanguage, ThemeColorControlCopy> = {
  ja: {
    label: "テーマカラー",
    resetLabel: "既定",
    pickerAriaLabel: "テーマカラーを選択",
  },
  en: {
    label: "Theme color",
    resetLabel: "Default",
    pickerAriaLabel: "Choose theme color",
  },
  zh: {
    label: "主题色",
    resetLabel: "默认",
    pickerAriaLabel: "选择主题色",
  },
};

const SettingsThemeColorControl = () => {
  const { settings, updateSettings } = useUserSettings();
  const language = settings?.language ?? "ja";
  const copy = THEME_COLOR_CONTROL_COPY[language];
  const accentColor = normalizeThemeAccentColor(settings?.accentColor);
  const handleColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    void updateSettings({ accentColor: event.target.value });
  };
  const handleReset = () => {
    void updateSettings({ accentColor: DEFAULT_THEME_ACCENT_COLOR });
  };
  return (
    <div className="absolute right-4 top-4 z-10 flex h-9 items-center gap-2 rounded-full border border-stone-200 bg-white/95 px-3 text-xs font-semibold leading-4 tracking-tight text-neutral-700 shadow-sm backdrop-blur">
      <span>{copy.label}</span>
      <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-stone-200 shadow-sm" style={{ backgroundColor: accentColor }}>
        <input className="absolute inset-0 h-full w-full cursor-pointer opacity-0" type="color" value={accentColor} aria-label={copy.pickerAriaLabel} onChange={handleColorChange} />
      </label>
      <button type="button" className="rounded-full border-0 bg-stone-100 px-2 py-1 text-xs font-semibold leading-4 text-neutral-600 outline-none hover:bg-stone-200 focus-visible:bg-stone-200" onClick={handleReset}>
        {copy.resetLabel}
      </button>
    </div>
  );
};

export { SettingsThemeColorControl };
