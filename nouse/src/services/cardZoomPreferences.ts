import { SHARED_STORAGE_KEYS } from "@platform/storage/storageKeys.constants";



interface CardZoomPreferencesStore {
  version: 1;
  byCardSet: Record<string, number>;
}



const empty = (): CardZoomPreferencesStore => {
  return {
    version: 1,
    byCardSet: {},
  };
};
const readStore = () => {
  try {
    if (typeof window === "undefined") return empty();

    const raw = window.localStorage.getItem(
      SHARED_STORAGE_KEYS.cardZoomPreferences,
    );
    if (!raw) return empty();

    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      (parsed as CardZoomPreferencesStore).version === 1 &&
      typeof (parsed as CardZoomPreferencesStore).byCardSet === "object"
    ) {
      return parsed as CardZoomPreferencesStore;
    }

    return empty();
  } catch {
    return empty();
  }
};
const writeStore = (store: CardZoomPreferencesStore) => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SHARED_STORAGE_KEYS.cardZoomPreferences,
      JSON.stringify(store),
    );
  } catch {
    // localStorage 失敗は黙殺
  }
};
const getCardSetZoomPreference = (cardSetId: string) => {
  if (!cardSetId) return undefined;

  const store = readStore();
  const value = store.byCardSet[cardSetId];

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  return undefined;
};
const setCardSetZoomPreference = (cardSetId: string, zoomPercent: number) => {
  if (!cardSetId) return;
  if (!Number.isFinite(zoomPercent) || zoomPercent <= 0) return;

  const store = readStore();
  store.byCardSet[cardSetId] = Math.round(zoomPercent);
  writeStore(store);
};



export { getCardSetZoomPreference, setCardSetZoomPreference };
