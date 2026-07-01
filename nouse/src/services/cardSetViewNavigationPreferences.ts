type CardSetViewNavigationPreferenceScope = {
  deviceScope: string;
  cardSetId: string | null | undefined;
};
type CardSetViewNavigationPreferenceUpdates = {
  cardId?: string | null;
  scrollTop?: number;
};
type CardSetViewNavigationPreference = {
  cardId: string | null;
  scrollTop: number;
  updatedAt: number;
};
type CardSetViewNavigationPreferencesStore = {
  version: 1;
  byScope: Record<string, CardSetViewNavigationPreference>;
};



const CARD_SET_VIEW_NAVIGATION_PREFERENCES_STORAGE_KEY = "sivflow:cardsetview-navigation-preferences:v1";
const LEGACY_CARD_SET_VIEW_NAVIGATION_PREFERENCES_STORAGE_KEY = "flashcard-master:cardsetview-navigation-preferences:v1";
const NO_CARD_SET_SCOPE_KEY = "__no_card_set__";



const emptyStore = (): CardSetViewNavigationPreferencesStore => ({
  version: 1,
  byScope: {},
});
const normalizeDeviceScope = (value: string | null | undefined) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : "unknown";
};
const buildPreferenceScopeKey = ({ deviceScope, cardSetId }: CardSetViewNavigationPreferenceScope) => {
  return [normalizeDeviceScope(deviceScope), cardSetId ?? NO_CARD_SET_SCOPE_KEY].join("::");
};
const normalizeCardId = (value: unknown) => typeof value === "string" && value.length > 0 ? value : null;
const normalizeScrollTop = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
const normalizeUpdatedAt = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
const normalizePreference = (value: unknown): CardSetViewNavigationPreference | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const preference = value as Partial<CardSetViewNavigationPreference>;
  return {
    cardId: normalizeCardId(preference.cardId),
    scrollTop: normalizeScrollTop(preference.scrollTop),
    updatedAt: normalizeUpdatedAt(preference.updatedAt),
  };
};
const parseStore = (raw: string | null): CardSetViewNavigationPreferencesStore | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CardSetViewNavigationPreferencesStore> | null;

    if (!parsed || parsed.version !== 1 || !parsed.byScope || typeof parsed.byScope !== "object") {
      return null;
    }

    const byScope: Record<string, CardSetViewNavigationPreference> = {};

    for (const [scopeKey, preference] of Object.entries(parsed.byScope)) {
      const normalizedPreference = normalizePreference(preference);

      if (normalizedPreference) {
        byScope[scopeKey] = normalizedPreference;
      }
    }

    return {
      version: 1,
      byScope,
    };
  } catch {
    return null;
  }
};
const readStore = (): CardSetViewNavigationPreferencesStore => {
  if (typeof window === "undefined") {
    return emptyStore();
  }

  try {
    return parseStore(window.localStorage.getItem(CARD_SET_VIEW_NAVIGATION_PREFERENCES_STORAGE_KEY)) ?? parseStore(window.localStorage.getItem(LEGACY_CARD_SET_VIEW_NAVIGATION_PREFERENCES_STORAGE_KEY)) ?? emptyStore();
  } catch {
    return emptyStore();
  }
};
const writeStore = (store: CardSetViewNavigationPreferencesStore) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CARD_SET_VIEW_NAVIGATION_PREFERENCES_STORAGE_KEY, JSON.stringify(store));
    window.localStorage.removeItem(LEGACY_CARD_SET_VIEW_NAVIGATION_PREFERENCES_STORAGE_KEY);
  } catch {
    // ローカル保存の失敗は無視します。
  }
};
const getCardSetViewNavigationPreference = (scope: CardSetViewNavigationPreferenceScope) => {
  if (!scope.cardSetId) {
    return null;
  }

  return readStore().byScope[buildPreferenceScopeKey(scope)] ?? null;
};
const setCardSetViewNavigationPreference = (scope: CardSetViewNavigationPreferenceScope, updates: CardSetViewNavigationPreferenceUpdates) => {
  if (!scope.cardSetId) {
    return;
  }

  const store = readStore();
  const scopeKey = buildPreferenceScopeKey(scope);
  const currentPreference = store.byScope[scopeKey] ?? {
    cardId: null,
    scrollTop: 0,
    updatedAt: 0,
  };

  store.byScope[scopeKey] = {
    cardId: updates.cardId !== undefined ? normalizeCardId(updates.cardId) : currentPreference.cardId,
    scrollTop: updates.scrollTop !== undefined ? normalizeScrollTop(updates.scrollTop) : currentPreference.scrollTop,
    updatedAt: Date.now(),
  };

  writeStore(store);
};



export { getCardSetViewNavigationPreference, setCardSetViewNavigationPreference };


export type { CardSetViewNavigationPreference };
