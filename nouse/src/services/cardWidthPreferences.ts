import { SHARED_STORAGE_KEYS } from "@platform/storage/storageKeys.constants";



type CardWidthPaneMode = "view" | "edit";
interface CardWidthEntry {
  view?: number;
  edit?: number;
}
interface CardWidthPreferencesStore {
  version: 1;
  byCardSet: Record<string, CardWidthEntry>;
}



const createEmptyStore = (): CardWidthPreferencesStore => ({
  version: 1,
  byCardSet: {},
});
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isCardWidthEntry = (value: unknown): value is CardWidthEntry => {
  if (!isRecord(value)) return false;

  const { view, edit } = value;
  const isValidValue = (candidate: unknown) =>
    candidate === undefined ||
    (typeof candidate === "number" &&
      Number.isFinite(candidate) &&
      candidate > 0);

  return isValidValue(view) && isValidValue(edit);
};
const normalizeStore = (value: unknown): CardWidthPreferencesStore => {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.byCardSet)) {
    return createEmptyStore();
  }

  const byCardSet = Object.fromEntries(
    Object.entries(value.byCardSet).filter(([, entry]) =>
      isCardWidthEntry(entry),
    ),
  ) as Record<string, CardWidthEntry>;

  return {
    version: 1,
    byCardSet,
  };
};
const readStore = (): CardWidthPreferencesStore => {
  try {
    if (typeof window === "undefined") return createEmptyStore();
    const raw = localStorage.getItem(SHARED_STORAGE_KEYS.cardWidthPreferences);
    if (!raw) return createEmptyStore();
    return normalizeStore(JSON.parse(raw));
  } catch {
    return createEmptyStore();
  }
};
const writeStore = (store: CardWidthPreferencesStore) => {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      SHARED_STORAGE_KEYS.cardWidthPreferences,
      JSON.stringify(store),
    );
  } catch {
    return;
  }
};
const getCardSetWidthPreference = (cardSetId: string, mode: CardWidthPaneMode): number | undefined => {
  const store = readStore();
  const entry = store.byCardSet[cardSetId];
  if (!entry) return undefined;
  const value = entry[mode];
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return undefined;
};
const setCardSetWidthPreference = (cardSetId: string, mode: CardWidthPaneMode, widthPx: number) => {
  if (!cardSetId) return;
  const store = readStore();
  const currentEntry = store.byCardSet[cardSetId] ?? {};
  store.byCardSet[cardSetId] = {
    ...currentEntry,
    [mode]: widthPx,
  };
  writeStore(store);
};



export { getCardSetWidthPreference, setCardSetWidthPreference };


export type { CardWidthPaneMode };
