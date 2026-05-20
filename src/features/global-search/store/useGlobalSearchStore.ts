import { create } from "zustand";

import type { GlobalSearchSource } from "@/features/global-search/model/globalSearchTypes";

type GlobalSearchState = {
  isOpen: boolean;
  query: string;
  sources: Record<string, GlobalSearchSource>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  registerSource: (source: GlobalSearchSource) => void;
  unregisterSource: (sourceId: string) => void;
};

export const useGlobalSearchStore = create<GlobalSearchState>((set) => ({
  isOpen: false,
  query: "",
  sources: {},
  open: () => {
    set({ isOpen: true });
  },
  close: () => {
    set({ isOpen: false, query: "" });
  },
  toggle: () => {
    set((state) => ({
      isOpen: !state.isOpen,
      query: state.isOpen ? "" : state.query,
    }));
  },
  setQuery: (query) => {
    set({ query });
  },
  registerSource: (source) => {
    set((state) => ({
      sources: {
        ...state.sources,
        [source.sourceId]: source,
      },
    }));
  },
  unregisterSource: (sourceId) => {
    set((state) => {
      const nextSources = { ...state.sources };
      delete nextSources[sourceId];
      return { sources: nextSources };
    });
  },
}));
