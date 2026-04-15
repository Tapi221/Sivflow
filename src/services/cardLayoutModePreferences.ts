import type { CardDisplayMode } from "@/types/domain/cardSet";
import {
  normalizeCardLayoutMode,
  resolveDefaultCardLayoutMode,
  type CardLayoutMode,
  type CardSetInteractionMode,
} from "@/features/cardsetview/domain/cardLayoutMode";

const STORAGE_KEY_PREFIX = "flashcard-master:card-layout-mode";

export interface CardLayoutModePreferenceScope {
  deviceScope: string;
  cardSetId: string | null | undefined;
  displayMode: CardDisplayMode;
  interactionMode: CardSetInteractionMode;
}

const normalizeDeviceScope = (value: string | null | undefined) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : "unknown";
};

const buildStorageKey = ({
  deviceScope,
  cardSetId,
  displayMode,
  interactionMode,
}: CardLayoutModePreferenceScope) => {
  return [
    STORAGE_KEY_PREFIX,
    normalizeDeviceScope(deviceScope),
    cardSetId ?? "__no_card_set__",
    displayMode,
    interactionMode,
  ].join(":");
};

const readStorageValue = (key: string) => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorageValue = (key: string, value: string) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore local persistence failures and keep the in-memory override path working.
  }
};

export const getCardLayoutModePreference = (
  scope: CardLayoutModePreferenceScope,
): CardLayoutMode | null => {
  if (!scope.cardSetId) return null;

  const raw = readStorageValue(buildStorageKey(scope));
  return raw == null ? null : normalizeCardLayoutMode(raw);
};

export const resolveCardLayoutModePreference = (
  scope: CardLayoutModePreferenceScope,
  fallbackMode?: CardLayoutMode | null,
): CardLayoutMode => {
  const stored = getCardLayoutModePreference(scope);
  if (stored) return stored;

  if (fallbackMode) {
    return normalizeCardLayoutMode(fallbackMode);
  }

  return resolveDefaultCardLayoutMode(scope.interactionMode);
};

export const setCardLayoutModePreference = (
  scope: CardLayoutModePreferenceScope,
  mode: CardLayoutMode,
) => {
  if (!scope.cardSetId) return;
  writeStorageValue(buildStorageKey(scope), normalizeCardLayoutMode(mode));
};
