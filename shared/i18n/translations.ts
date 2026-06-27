import rawTranslations from "@shared/i18n/translations.json";
import type { Locale } from "@shared/i18n/locale.store";

type RawTranslations = Omit<(typeof rawTranslations)[Locale], "dateFnsLocaleKey"> & {
  dateFnsLocaleKey: "ja" | "en-US" | "zh-CN";
};
type Translations = Omit<RawTranslations, "overflowEvents"> & {
  overflowEvents: (count: number) => string;
};

const RAW_TRANSLATIONS = rawTranslations as Record<Locale, RawTranslations>;
const TRANSLATIONS: Record<Locale, Translations> = {
  ja: {
    ...RAW_TRANSLATIONS.ja,
    overflowEvents: (count: number) =>
      RAW_TRANSLATIONS.ja.overflowEvents.replace("{{count}}", String(count)),
  },
  en: {
    ...RAW_TRANSLATIONS.en,
    overflowEvents: (count: number) =>
      RAW_TRANSLATIONS.en.overflowEvents.replace("{{count}}", String(count)),
  },
  zh: {
    ...RAW_TRANSLATIONS.zh,
    overflowEvents: (count: number) =>
      RAW_TRANSLATIONS.zh.overflowEvents.replace("{{count}}", String(count)),
  },
};

export { RAW_TRANSLATIONS, TRANSLATIONS };
export type { RawTranslations, Translations };
