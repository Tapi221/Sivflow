import { create } from "zustand";
import type { SearchSource } from "@/features/search/model/search.types";



type SearchState = {
  isOpen: boolean;
  query: string;
  sources: Record<string, SearchSource>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  registerSource: (source: SearchSource) => void;
  unregisterSource: (sourceId: string) => void;
};



const useSearchStore = create<SearchState>((set) => ({ isOpen: false, query: "", sources: {}, open: () => {
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



export { useSearchStore };
