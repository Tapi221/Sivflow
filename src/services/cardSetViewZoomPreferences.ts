import { SHARED_STORAGE_KEYS } from "@platform/storage/storageKeys.constants";
import type { CardLayoutMode, CardSetInteractionMode } from "@/features/cardsetview/domain/cardLayoutMode";
import type { CardDisplayMode } from "@/types/domain/cardSet";



interface CardSetViewZoomPreferencesStore {
  version: 2;
  byScope: Record<string, number>;
}
interface LegacyCardSetViewZoomPreferencesStore {
  version: 1;
  byCardSet: Record<string, number>;
}
interface CardSetViewZoomPreferenceScope {
  deviceScope: string;
  cardSetId: string | null | undefined;
  displayMode?: CardDisplayMode;
  interactionMode?: CardSetInteractionMode;
  cardLayoutMode?: CardLayoutMode;
}
type LegacyCardSetViewZoomPreferenceScope = {
  deviceScope: string;
  cardSetId: string | null | undefined;
  displayMode: CardDisplayMode;
  interactionMode: CardSetInteractionMode;
  cardLayoutMode: CardLayoutMode;
};



const emptyStore = (): CardSetViewZoomPreferencesStore => ({
  version: 2,
  byScope: {},
});
const normalizeDeviceScope = (value: string | null | undefined) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : "unknown";
};
const buildLegacyZoomPreferenceScopeKey = ({
  deviceScope,
  cardSetId,
  displayMode,
  interactionMode,
  cardLayoutMode,
}: LegacyCardSetViewZoomPreferenceScope) => {
  return [
    normalizeDeviceScope(deviceScope),
    cardSetId ?? "__no_card_set__",
    displayMode,
    interactionMode,
    cardLayoutMode,
  ].join("::");
};
const buildCardSetViewZoomPreferenceScopeKey = ({ deviceScope, cardSetId }: CardSetViewZoomPreferenceScope) => {
  return [normalizeDeviceScope(deviceScope), cardSetId ?? "__no_card_set__"].join("::");
};
const canResolveLegacyScopedKey = (
  scope: CardSetViewZoomPreferenceScope,
): scope is LegacyCardSetViewZoomPreferenceScope => {
  return (
    (scope.displayMode !== null && scope.displayMode !== undefined) &&
    (scope.interactionMode !== null && scope.interactionMode !== undefined) &&
    (scope.cardLayoutMode !== null && scope.cardLayoutMode !== undefined)
  );
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
const readStoredZoomPercent = ({
  store,
  scope,
}: {
  store: CardSetViewZoomPreferencesStore;
  scope: CardSetViewZoomPreferenceScope;
}) => {
  const currentValue =
    store.byScope[buildCardSetViewZoomPreferenceScopeKey(scope)];

  if (
    typeof currentValue === "number" &&
    Number.isFinite(currentValue) &&
    currentValue >= 0 &&
    currentValue <= 100
  ) {
    return currentValue;
  }

  if (canResolveLegacyScopedKey(scope)) {
    const legacyScopedValue =
      store.byScope[buildLegacyZoomPreferenceScopeKey(scope)];

    if (
      typeof legacyScopedValue === "number" &&
      Number.isFinite(legacyScopedValue) &&
      legacyScopedValue >= 0 &&
      legacyScopedValue <= 100
    ) {
      return legacyScopedValue;
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
    return;
  }
};
const migrateLegacyScopedZoomPreference = ({
  store,
  scope,
  zoomPercent,
}: {
  store: CardSetViewZoomPreferencesStore;
  scope: CardSetViewZoomPreferenceScope;
  zoomPercent: number;
}) => {
  store.byScope[buildCardSetViewZoomPreferenceScopeKey(scope)] = zoomPercent;
  writeStore(store);
};
const getCardSetViewZoomPreference = (scope: CardSetViewZoomPreferenceScope) => {
  if (!scope.cardSetId) {
    return undefined;
  }

  const store = readStore();
  const storedZoomPercent = readStoredZoomPercent({ store, scope });

  if ((storedZoomPercent !== null && storedZoomPercent !== undefined)) {
    if (
      canResolveLegacyScopedKey(scope) &&
      buildCardSetViewZoomPreferenceScopeKey(scope) !==
      buildLegacyZoomPreferenceScopeKey(scope)
    ) {
      migrateLegacyScopedZoomPreference({
        store,
        scope,
        zoomPercent: storedZoomPercent,
      });
    }

    return storedZoomPercent;
  }

  return readLegacyCardSetValue(scope.cardSetId);
};
const setCardSetViewZoomPreference = (scope: CardSetViewZoomPreferenceScope, zoomPercent: number) => {
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



export { buildCardSetViewZoomPreferenceScopeKey, getCardSetViewZoomPreference, setCardSetViewZoomPreference };


export type { CardSetViewZoomPreferenceScope };
