import {
  DEFAULT_SPLIT_FALLBACK_CARD_LAYOUT_MODE,
  normalizeSplitFallbackCardLayoutMode,
  type SplitFallbackCardLayoutMode,
} from "@/features/cardsetview/domain/cardLayoutMode";

const STORAGE_KEY = "flashcard-master:card-layout-split-fallback";

interface SplitFallbackPreferencesStore {
  version: 1;
  byDeviceScope: Record<string, SplitFallbackCardLayoutMode>;
}

const emptyStore = (): SplitFallbackPreferencesStore => ({
  version: 1,
  byDeviceScope: {},
});

const normalizeDeviceScope = (value: string | null | undefined) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : "unknown";
};

const parseStore = (raw: string | null) => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      raw,
    ) as Partial<SplitFallbackPreferencesStore> | null;
    if (
      parsed &&
      parsed.version === 1 &&
      parsed.byDeviceScope &&
      typeof parsed.byDeviceScope === "object"
    ) {
      return parsed as SplitFallbackPreferencesStore;
    }
  } catch {
    return null;
  }

  return null;
};

const readStore = () => {
  if (typeof window === "undefined") {
    return emptyStore();
  }

  try {
    return parseStore(window.localStorage.getItem(STORAGE_KEY)) ?? emptyStore();
  } catch {
    return emptyStore();
  }
};

const writeStore = (store: SplitFallbackPreferencesStore) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore local persistence failures
  }
};

export const resolveSplitFallbackLayoutModePreference = (
  deviceScope: string,
  fallbackMode: SplitFallbackCardLayoutMode = DEFAULT_SPLIT_FALLBACK_CARD_LAYOUT_MODE,
) => {
  const store = readStore();
  const stored = store.byDeviceScope[normalizeDeviceScope(deviceScope)];
  return stored ? normalizeSplitFallbackCardLayoutMode(stored) : fallbackMode;
};

export const setSplitFallbackLayoutModePreference = (
  deviceScope: string,
  mode: SplitFallbackCardLayoutMode,
) => {
  const store = readStore();
  store.byDeviceScope[normalizeDeviceScope(deviceScope)] =
    normalizeSplitFallbackCardLayoutMode(mode);
  writeStore(store);
};
