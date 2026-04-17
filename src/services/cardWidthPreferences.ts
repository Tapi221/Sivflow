import { SHARED_STORAGE_KEYS } from "@constants/shared/storage";

/**
 * Device-local persistence for per-card-set pane width preferences.
 *
 * Storage: localStorage (inherently device-local — no cross-device sync).
 * Key structure is versioned so a future `deviceKey` nesting can be added
 * without breaking existing stored data.
 *
 * Schema (v1):
 *   "card-width-preferences" → {
 *     version: 1,
 *     byCardSet: {
 *       [cardSetId]: { view?: number; edit?: number }
 *     }
 *   }
 */

export type CardWidthPaneMode = "view" | "edit";

interface CardWidthEntry {
  view?: number;
  edit?: number;
}

interface CardWidthPreferencesStore {
  version: 1;
  byCardSet: Record<string, CardWidthEntry>;
}

const readStore = () => {
  try {
    if (typeof window === "undefined") return empty();
    const raw = localStorage.getItem(SHARED_STORAGE_KEYS.cardWidthPreferences);
    if (!raw) return empty();
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      (parsed as CardWidthPreferencesStore).version === 1 &&
      typeof (parsed as CardWidthPreferencesStore).byCardSet === "object"
    ) {
      return parsed as CardWidthPreferencesStore;
    }
    return empty();
  } catch {
    return empty();
  }
};

const empty = () => {
  return { version: 1, byCardSet: {} };
};

const writeStore = (store: CardWidthPreferencesStore) => {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      SHARED_STORAGE_KEYS.cardWidthPreferences,
      JSON.stringify(store),
    );
  } catch {
    // Ignore write failures (e.g. private browsing quota exceeded).
  }
};

/**
 * Returns the stored width for (cardSetId, mode), or undefined if not found.
 * The caller is responsible for clamping the returned value.
 */
export const getCardSetWidthPreference = (
  cardSetId: string,
  mode: CardWidthPaneMode,
) => {
  const store = readStore();
  const entry = store.byCardSet[cardSetId];
  if (!entry) return undefined;
  const value = entry[mode];
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return undefined;
};

/**
 * Persists (cardSetId, mode, widthPx) to localStorage.
 * Should be called with an already-clamped value.
 */
export const setCardSetWidthPreference = (
  cardSetId: string,
  mode: CardWidthPaneMode,
  widthPx: number,
) => {
  if (!cardSetId) return;
  const store = readStore();
  if (!store.byCardSet[cardSetId]) {
    store.byCardSet[cardSetId] = {};
  }
  store.byCardSet[cardSetId][mode] = widthPx;
  writeStore(store);
};
