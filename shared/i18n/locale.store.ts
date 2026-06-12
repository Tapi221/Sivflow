import { create } from "zustand";
import { persist } from "zustand/middleware";

type Locale = "ja" | "en" | "zh";
type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const SIVFLOW_LOCALE_STORAGE_KEY = "sivflow.locale";
const LEGACY_LOCALE_STORAGE_KEY = "flashcard-master.locale";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isLocale = (value: unknown): value is Locale => value === "ja" || value === "en" || value === "zh";
const parseStoredLocale = (raw: string | null): Locale | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;
    const state = parsed.state;
    if (!isRecord(state)) return null;
    return isLocale(state.locale) ? state.locale : null;
  } catch {
    return null;
  }
};
const readStorageItem = (key: string): string | null => {
  if (typeof localStorage === "undefined") return null;

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const readStoredLocaleByKey = (key: string): Locale | null => parseStoredLocale(readStorageItem(key));
const readStoredLocale = (): Locale | null => readStoredLocaleByKey(SIVFLOW_LOCALE_STORAGE_KEY) ?? readStoredLocaleByKey(LEGACY_LOCALE_STORAGE_KEY);
const migrateLegacyLocaleStorage = (): void => {
  if (typeof localStorage === "undefined") return;
  if (readStorageItem(SIVFLOW_LOCALE_STORAGE_KEY)) return;

  const legacyValue = readStorageItem(LEGACY_LOCALE_STORAGE_KEY);
  if (!legacyValue || !readStoredLocaleByKey(LEGACY_LOCALE_STORAGE_KEY)) return;

  try {
    localStorage.setItem(SIVFLOW_LOCALE_STORAGE_KEY, legacyValue);
    localStorage.removeItem(LEGACY_LOCALE_STORAGE_KEY);
  } catch {
    // localStorage を書き換えられない環境では、起動中の locale だけ fallback する。
  }
};
migrateLegacyLocaleStorage();

const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: readStoredLocale() ?? "ja",
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: SIVFLOW_LOCALE_STORAGE_KEY,
    },
  ),
);

export { readStoredLocale, useLocaleStore };
export type { Locale };
