export const SETTINGS_TAB_PARAMS = [
  "study",
  "display",
  "tags",
  "voice",
  "shortcut",
  "sync",
  "theme",
] as const;

export type SettingsTabParam = (typeof SETTINGS_TAB_PARAMS)[number];
export type SettingsTab = Exclude<SettingsTabParam, "theme">;

export const DEFAULT_SETTINGS_TAB: SettingsTab = "study";

const SETTINGS_TAB_PARAM_SET = new Set<string>(SETTINGS_TAB_PARAMS);

export const isSettingsTabParam = (
  value: string | null | undefined,
): value is SettingsTabParam =>
  typeof value === "string" && SETTINGS_TAB_PARAM_SET.has(value);
