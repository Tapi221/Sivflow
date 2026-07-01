import { cn } from "@web-renderer/lib/utils";
import type { ChangeEvent } from "react";
import { DEFAULT_THEME_ACCENT_COLOR, normalizeThemeAccentColor, useUserSettings } from "@/features/settings/hooks/useUserSettings";
import type { UserSettings } from "@/types";



type SettingsThemeColorControlProps = {
  className?: string;
  labelClassName?: string;
};
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



const SettingsThemeColorControl = ({ className, labelClassName }: SettingsThemeColorControlProps) => {
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
    <div className={cn("settings-theme-color-control flex min-h-14 items-center justify-between gap-4 border-b border-stone-100 px-6 py-3 last:border-b-0", className)}>
      <span className={cn("text-sm font-medium leading-5 tracking-tight text-neutral-800", labelClassName)}>{copy.label}</span>
      <div className="flex shrink-0 items-center gap-2">
        <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-stone-200 shadow-sm" style={{ backgroundColor: accentColor }}>
          <input className="absolute inset-0 h-full w-full cursor-pointer opacity-0" type="color" value={accentColor} aria-label={copy.pickerAriaLabel} onChange={handleColorChange} />
        </label>
        <button type="button" className="h-8 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-medium tracking-tight text-neutral-800 outline-none hover:bg-stone-100 focus-visible:bg-stone-100" onClick={handleReset}>
          {copy.resetLabel}
        </button>
      </div>
    </div>
  );
};



export { SettingsThemeColorControl };


export type { SettingsThemeColorControlProps };
