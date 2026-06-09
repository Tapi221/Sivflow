import * as blockNoteLocales from "@blocknote/core/locales";

type BlockNoteLocaleCode = string;
type BlockNoteDictionary = (typeof blockNoteLocales)[keyof typeof blockNoteLocales];
type BlockNoteLanguagePreferences = {
  documentLanguage?: string | null;
  navigatorLanguages?: readonly string[] | null;
  navigatorLanguage?: string | null;
};
type BlockNoteSlashMenuItemOverride = {
  title?: string;
  subtext?: string;
  group?: string;
};

const FALLBACK_BLOCKNOTE_LOCALE = "en";
const JAPANESE_BLOCKNOTE_LOCALE = "ja";
const BLOCKNOTE_LOCALE_MODULE = blockNoteLocales as unknown as Record<string, BlockNoteDictionary>;
const BLOCKNOTE_LOCALE_REGISTRY = "default" in BLOCKNOTE_LOCALE_MODULE && Boolean(BLOCKNOTE_LOCALE_MODULE.default) && typeof BLOCKNOTE_LOCALE_MODULE.default === "object" && "en" in (BLOCKNOTE_LOCALE_MODULE.default as object) ? BLOCKNOTE_LOCALE_MODULE.default as unknown as Record<string, BlockNoteDictionary> : BLOCKNOTE_LOCALE_MODULE;
const BLOCKNOTE_LOCALE_CODES = Object.keys(BLOCKNOTE_LOCALE_REGISTRY).filter((localeCode) => localeCode !== "default");
const JAPANESE_SLASH_MENU_OVERRIDES: Record<string, BlockNoteSlashMenuItemOverride> = {
  heading: { subtext: "大見出し" },
  heading_2: { subtext: "中見出し" },
  heading_3: { subtext: "小見出し" },
  quote: { subtext: "引用文" },
  toggle_list: { title: "折りたたみ", subtext: "開閉できるリスト" },
  numbered_list: { title: "番号付き", subtext: "番号付きリスト" },
  bullet_list: { subtext: "箇条書きリスト" },
  check_list: { title: "チェック", subtext: "チェックリスト" },
  paragraph: { title: "テキスト", subtext: "本文" },
  code_block: { title: "コード", subtext: "コードブロック" },
  divider: { subtext: "区切り線" },
  table: { subtext: "表を挿入" },
  image: { subtext: "画像を挿入" },
  video: { subtext: "動画を挿入" },
  audio: { subtext: "音声を挿入" },
  file: { subtext: "ファイルを挿入" },
  emoji: { subtext: "絵文字を挿入" },
};

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

const isDictionaryRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const withJapaneseSlashMenuOverrides = (dictionary: BlockNoteDictionary): BlockNoteDictionary => {
  const dictionaryRecord = dictionary as unknown as Record<string, unknown>;
  const slashMenu = dictionaryRecord.slash_menu;
  if (!isDictionaryRecord(slashMenu)) return dictionary;

  const nextSlashMenu = { ...slashMenu };

  for (const [key, override] of Object.entries(JAPANESE_SLASH_MENU_OVERRIDES)) {
    const item = nextSlashMenu[key];
    if (!isDictionaryRecord(item)) continue;
    nextSlashMenu[key] = { ...item, ...override };
  }

  return { ...dictionaryRecord, slash_menu: nextSlashMenu } as unknown as BlockNoteDictionary;
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
  const locale = resolveBlockNoteLocale(preferences);
  const dictionary = BLOCKNOTE_LOCALE_REGISTRY[locale] ?? getFallbackBlockNoteDictionary();

  return locale === JAPANESE_BLOCKNOTE_LOCALE ? withJapaneseSlashMenuOverrides(dictionary) : dictionary;
};

export { resolveBlockNoteDictionary, resolveBlockNoteLocale };
export type { BlockNoteLanguagePreferences, BlockNoteLocaleCode };
