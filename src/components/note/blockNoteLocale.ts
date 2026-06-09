import * as blockNoteLocales from "@blocknote/core/locales";

type BlockNoteLocaleCode = string;
type BlockNoteDictionary = (typeof blockNoteLocales)[keyof typeof blockNoteLocales];
type BlockNoteLanguagePreferences = {
  documentLanguage?: string | null;
  navigatorLanguages?: readonly string[] | null;
  navigatorLanguage?: string | null;
};

const FALLBACK_BLOCKNOTE_LOCALE = "en";
const BLOCKNOTE_LOCALE_MODULE = blockNoteLocales as unknown as Record<string, BlockNoteDictionary>;
const BLOCKNOTE_LOCALE_REGISTRY = "default" in BLOCKNOTE_LOCALE_MODULE && Boolean(BLOCKNOTE_LOCALE_MODULE.default) && typeof BLOCKNOTE_LOCALE_MODULE.default === "object" && "en" in (BLOCKNOTE_LOCALE_MODULE.default as object) ? BLOCKNOTE_LOCALE_MODULE.default as unknown as Record<string, BlockNoteDictionary> : BLOCKNOTE_LOCALE_MODULE;
const BLOCKNOTE_LOCALE_CODES = Object.keys(BLOCKNOTE_LOCALE_REGISTRY).filter((localeCode) => localeCode !== "default");

const getDocumentLanguage = (): string | undefined => {
  if (typeof document === "undefined") return undefined;

  return document.documentElement.lang;
};

const getNavigatorLanguages = (): readonly string[] => {
  if (typeof navigator === "undefined" || !Array.isArray(navigator.languages)) return [];

  return navigator.languages;
};

const getNavigatorLanguage = (): string | undefined => {
  if (typeof navigator === "undefined") return undefined;

  return navigator.language;
};

const getFallbackBlockNoteDictionary = (): BlockNoteDictionary => {
  const fallbackDictionary = BLOCKNOTE_LOCALE_REGISTRY[FALLBACK_BLOCKNOTE_LOCALE];
  if (fallbackDictionary) return fallbackDictionary;

  const firstLocaleCode = BLOCKNOTE_LOCALE_CODES[0];
  if (firstLocaleCode) return BLOCKNOTE_LOCALE_REGISTRY[firstLocaleCode];

  throw new Error("BlockNote locale dictionaries are unavailable.");
};

const toDefinedLanguages = (languages: readonly (string | null | undefined)[]): string[] => {
  return languages.filter((language): language is string => typeof language === "string");
};

const getLanguagePreferences = (preferences: BlockNoteLanguagePreferences = {}): string[] => {
  const documentLanguage = preferences.documentLanguage ?? getDocumentLanguage();
  const navigatorLanguages = preferences.navigatorLanguages ?? getNavigatorLanguages();
  const navigatorLanguage = preferences.navigatorLanguage ?? getNavigatorLanguage();

  return toDefinedLanguages([...navigatorLanguages, navigatorLanguage, documentLanguage]);
};

const findBlockNoteLocale = (value: string): BlockNoteLocaleCode | undefined => {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) return undefined;

  return BLOCKNOTE_LOCALE_CODES.find((localeCode) => localeCode.toLowerCase() === normalizedValue);
};

const toBlockNoteLocaleCandidates = (language: string): string[] => {
  const normalizedLanguage = language.trim();
  if (!normalizedLanguage) return [];

  const regionSeparatorNormalizedLanguage = normalizedLanguage.replaceAll("-", "_");
  const primaryLanguage = regionSeparatorNormalizedLanguage.split("_")[0] ?? "";

  return [...new Set([normalizedLanguage, regionSeparatorNormalizedLanguage, primaryLanguage].filter(Boolean))];
};

const resolveBlockNoteLocale = (preferences?: BlockNoteLanguagePreferences): BlockNoteLocaleCode => {
  for (const language of getLanguagePreferences(preferences)) {
    for (const candidate of toBlockNoteLocaleCandidates(language)) {
      const locale = findBlockNoteLocale(candidate);
      if (locale) return locale;
    }
  }

  return FALLBACK_BLOCKNOTE_LOCALE;
};

const resolveBlockNoteDictionary = (preferences?: BlockNoteLanguagePreferences): BlockNoteDictionary => {
  return BLOCKNOTE_LOCALE_REGISTRY[resolveBlockNoteLocale(preferences)] ?? getFallbackBlockNoteDictionary();
};

export { resolveBlockNoteDictionary, resolveBlockNoteLocale };
export type { BlockNoteLanguagePreferences, BlockNoteLocaleCode };
