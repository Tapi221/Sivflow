import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "ja" | "en";

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "ja",
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "flashcard-master.locale",
    },
  ),
);