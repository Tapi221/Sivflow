const STORAGE_KEY = "card-set-view-zoom-preferences";
const LEGACY_STORAGE_KEY = "card-view-zoom-preferences";

interface CardSetViewZoomPreferencesStore {
  version: 1;
  byCardSet: Record<string, number>;
}

const emptyStore = (): CardSetViewZoomPreferencesStore => ({
  version: 1,
  byCardSet: {},
});

const parseStore = (raw: string | null) => {
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(
    raw,
  ) as Partial<CardSetViewZoomPreferencesStore> | null;

  if (
    parsed &&
    parsed.version === 1 &&
    parsed.byCardSet &&
    typeof parsed.byCardSet === "object"
  ) {
    return parsed as CardSetViewZoomPreferencesStore;
  }

  return null;
};

const readStore = (): CardSetViewZoomPreferencesStore => {
  try {
    if (typeof window === "undefined") {
      return emptyStore();
    }

    const current = parseStore(window.localStorage.getItem(STORAGE_KEY));
    if (current) {
      return current;
    }

    const legacy = parseStore(window.localStorage.getItem(LEGACY_STORAGE_KEY));
    if (legacy) {
      return legacy;
    }

    return emptyStore();
  } catch {
    return emptyStore();
  }
};

const writeStore = (store: CardSetViewZoomPreferencesStore) => {
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
