import type { Locale } from "./locale.store";
import { RAW_TRANSLATIONS } from "./translations";
import type { RawTranslations } from "./translations";

type TranslationKey = keyof RawTranslations;
type TranslationParams = {
  count?: number;
};

const interpolate = (template: string, params: TranslationParams = {}): string =>
  template.replace(/\{\{count\}\}/g, String(params.count ?? ""));
const translate = (locale: Locale, key: TranslationKey, params?: TranslationParams,): string | string[] => {
  const value = RAW_TRANSLATIONS[locale][key];

  if (typeof value === "string") {
    return interpolate(value, params);
  }

  return value;
};

export { translate };

export type { TranslationKey, TranslationParams };
