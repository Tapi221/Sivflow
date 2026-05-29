import type { Locale } from "./locale.store";
import { RAW_TRANSLATIONS, type RawTranslations } from "./translations";

export type TranslationKey = keyof RawTranslations;

export type TranslationParams = {
  count?: number;
};

const interpolate = (template: string, params: TranslationParams = {}): string =>
  template.replace(/\{\{count\}\}/g, String(params.count ?? ""));

export const translate = (
  locale: Locale,
  key: TranslationKey,
  params?: TranslationParams,
): string | string[] => {
  const value = RAW_TRANSLATIONS[locale][key];

  if (typeof value === "string") {
    return interpolate(value, params);
  }

  return value;
};
