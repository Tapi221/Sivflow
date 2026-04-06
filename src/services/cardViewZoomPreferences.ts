const STORAGE_KEY = "card-view-zoom-preferences";

interface CardViewZoomPreferencesStore {
  version: 1;
  byCardSet: Record<string, number>;
}

const emptyStore = (): CardViewZoomPreferencesStore => ({
  version: 1,
  byCardSet: {},
});

const readStore = (): CardViewZoomPreferencesStore => {
  try {
    if (typeof window === "undefined") {
      return emptyStore();
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyStore();
    }

    const parsed = JSON.parse(
      raw,
    ) as Partial<CardViewZoomPreferencesStore> | null;
    if (
      parsed &&
      parsed.version === 1 &&
      parsed.byCardSet &&
      typeof parsed.byCardSet === "object"
    ) {
      return parsed as CardViewZoomPreferencesStore;
    }

    return emptyStore();
  } catch {
    return emptyStore();
  }
};

const writeStore = (store: CardViewZoomPreferencesStore) => {
  try {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
};

export const getCardSetViewZoomPreference = (cardSetId: string) => {
  if (!cardSetId) {
    return undefined;
  }

  const store = readStore();
  const value = store.byCardSet[cardSetId];

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return value;
};

export const setCardSetViewZoomPreference = (
  cardSetId: string,
  zoomPercent: number,
) => {
  if (!cardSetId) {
    return;
  }

  const store = readStore();
  store.byCardSet[cardSetId] = zoomPercent;
  writeStore(store);
};
