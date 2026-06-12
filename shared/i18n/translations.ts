import rawTranslations from "./translations.json";
import type { Locale } from "./locale.store";

type RawTranslations = Omit<(typeof rawTranslations)[Locale], "dateFnsLocaleKey"> & {
  dateFnsLocaleKey: "ja" | "en-US" | "zh-CN";
};
type Translations = Omit<RawTranslations, "overflowEvents"> & {
  overflowEvents: (count: number) => string;
};

const RAW_TRANSLATIONS = rawTranslations as Record<Locale, RawTranslations>;

const formatCountTemplate = (template: string, count: number): string =>
  template.replace("{{count}}", String(count));
const toTranslations = (translations: RawTranslations): Translations => ({
  ...translations,
  overflowEvents: (count: number) => formatCountTemplate(translations.overflowEvents, count),
});

const TRANSLATIONS: Record<Locale, Translations> = {
  ja: toTranslations(RAW_TRANSLATIONS.ja),
  en: toTranslations(RAW_TRANSLATIONS.en),
  zh: toTranslations(RAW_TRANSLATIONS.zh),
};

export { RAW_TRANSLATIONS, TRANSLATIONS };
export type { RawTranslations, Translations };
