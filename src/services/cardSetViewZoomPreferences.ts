import { SHARED_STORAGE_KEYS } from "@constants/shared/storage";
import type {
  CardLayoutMode,
  CardSetInteractionMode,
} from "@/features/cardsetview/domain/cardLayoutMode";
import type { CardDisplayMode } from "@/types/domain/cardSet";

interface CardSetViewZoomPreferencesStore {
  version: 2;
  byScope: Record<string, number>;
}

interface LegacyCardSetViewZoomPreferencesStore {
  version: 1;
  byCardSet: Record<string, number>;
}

export interface CardSetViewZoomPreferenceScope {
  deviceScope: string;
  cardSetId: string | null | undefined;
  displayMode: CardDisplayMode;
  interactionMode: CardSetInteractionMode;
  cardLayoutMode: CardLayoutMode;
}

const emptyStore = (): CardSetViewZoomPreferencesStore => ({
  version: 2,
  byScope: {},
});

const normalizeDeviceScope = (value: string | null | undefined) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : "unknown";
};

export const buildCardSetViewZoomPreferenceScopeKey = ({
  deviceScope,
  cardSetId,
  displayMode,
  interactionMode,
  cardLayoutMode,
}: CardSetViewZoomPreferenceScope) => {
  return [
    normalizeDeviceScope(deviceScope),
    cardSetId ?? "__no_card_set__",
    displayMode,
    interactionMode,
    cardLayoutMode,
  ].join("::");
};

const parseCurrentStore = (raw: string | null) => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      raw,
    ) as Partial<CardSetViewZoomPreferencesStore> | null;

    if (
      parsed &&
      parsed.version === 2 &&
      parsed.byScope &&
      typeof parsed.byScope === "object"
    ) {
      return parsed as CardSetViewZoomPreferencesStore;
    }
  } catch {
    return null;
  }

  return null;
};

const parseLegacyStore = (raw: string | null) => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      raw,
    ) as Partial<LegacyCardSetViewZoomPreferencesStore> | null;

    if (
      parsed &&
      parsed.version === 1 &&
      parsed.byCardSet &&
      typeof parsed.byCardSet === "object"
    ) {
      return parsed as LegacyCardSetViewZoomPreferencesStore;
    }
  } catch {
    return null;
  }

  return null;
};

const readStore = (): CardSetViewZoomPreferencesStore => {
  if (typeof window === "undefined") {
    return emptyStore();
  }

  try {
    return (
      parseCurrentStore(
        window.localStorage.getItem(
          SHARED_STORAGE_KEYS.cardSetViewZoomPreferences,
        ),
      ) ?? emptyStore()
    );
  } catch {
    return emptyStore();
  }
};

const readLegacyCardSetValue = (cardSetId: string) => {
  if (typeof window === "undefined" || !cardSetId) {
    return undefined;
  }

  for (const legacyKey of SHARED_STORAGE_KEYS.cardSetViewZoomPreferencesLegacy) {
    const store = parseLegacyStore(window.localStorage.getItem(legacyKey));
    const value = store?.byCardSet?.[cardSetId];

    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return value;
    }
  }

  return undefined;
};

const writeStore = (store: CardSetViewZoomPreferencesStore) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      SHARED_STORAGE_KEYS.cardSetViewZoomPreferences,
      JSON.stringify(store),
    );
    for (const legacyKey of SHARED_STORAGE_KEYS.cardSetViewZoomPreferencesLegacy) {
      window.localStorage.removeItem(legacyKey);
    }
  } catch {
    // ignore local persistence failures
  }
};

export const getCardSetViewZoomPreference = (
  scope: CardSetViewZoomPreferenceScope,
) => {
  if (!scope.cardSetId) {
    return undefined;
  }

  const store = readStore();
  const key = buildCardSetViewZoomPreferenceScopeKey(scope);
  const currentValue = store.byScope[key];

  if (
    typeof currentValue === "number" &&
    Number.isFinite(currentValue) &&
    currentValue >= 0 &&
    currentValue <= 100
  ) {
    return currentValue;
  }

  return readLegacyCardSetValue(scope.cardSetId);
};

export const setCardSetViewZoomPreference = (
  scope: CardSetViewZoomPreferenceScope,
  zoomPercent: number,
) => {
  if (!scope.cardSetId) {
    return;
  }

  const safeZoomPercent =
    Number.isFinite(zoomPercent) && zoomPercent >= 0 && zoomPercent <= 100
      ? zoomPercent
      : 0;

  const store = readStore();
  store.byScope[buildCardSetViewZoomPreferenceScopeKey(scope)] =
    safeZoomPercent;
  writeStore(store);
};
