import { SHARED_STORAGE_KEYS } from "@constants/shared/storage";

type CardSetViewFlippedFaceScope = {
  deviceScope: string;
  cardSetId: string | null | undefined;
};

type LegacyCardSetViewFlippedFaceScopeHint = {
  cardSetId: string | null | undefined;
  folderId: string | null | undefined;
};

const normalizeDeviceScope = (value: string | null | undefined) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : "unknown";
};

export const buildCardSetViewFlippedFaceScopeKey = ({
  deviceScope,
  cardSetId,
}: CardSetViewFlippedFaceScope) => {
  return [
    SHARED_STORAGE_KEYS.cardSetViewFlippedFacePrefix,
    normalizeDeviceScope(deviceScope),
    cardSetId ?? "__no_card_set__",
  ].join("::");
};

const buildLegacySessionStorageKey = ({
  cardSetId,
  folderId,
}: LegacyCardSetViewFlippedFaceScopeHint) => {
  return [
    SHARED_STORAGE_KEYS.cardSetViewFlippedFacePrefix,
    cardSetId ?? "__no_card_set__",
    folderId ?? "__no_folder__",
  ].join(":");
};

const readLocalValue = (key: string) => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeLocalValue = (key: string, value: string | null) => {
  if (typeof window === "undefined") return;

  try {
    if (value == null) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, value);
  } catch {
    // Ignore local persistence failures and keep in-memory state working.
  }
};

const readLegacySessionValue = (
  legacyScopeHint: LegacyCardSetViewFlippedFaceScopeHint | null,
) => {
  if (typeof window === "undefined" || !legacyScopeHint?.cardSetId) {
    return null;
  }

  const keys = [
    buildLegacySessionStorageKey(legacyScopeHint),
    buildLegacySessionStorageKey({
      cardSetId: legacyScopeHint.cardSetId,
      folderId: null,
    }),
  ];

  try {
    for (const key of keys) {
      const value = window.sessionStorage.getItem(key);
      if (value) {
        window.sessionStorage.removeItem(key);
        return value;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const normalizeCardIdList = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0,
  );
};

export const getCardSetViewFlippedCardIds = ({
  deviceScope,
  cardSetId,
  legacyScopeHint,
}: CardSetViewFlippedFaceScope & {
  legacyScopeHint?: LegacyCardSetViewFlippedFaceScopeHint | null;
}) => {
  if (!cardSetId) return new Set<string>();

  const currentScope = { deviceScope, cardSetId };
  const currentStorageKey = buildCardSetViewFlippedFaceScopeKey(currentScope);
  const raw =
    readLocalValue(currentStorageKey) ??
    readLegacySessionValue(legacyScopeHint ?? null);
  if (!raw) return new Set<string>();

  try {
    const parsedIds = new Set<string>(normalizeCardIdList(JSON.parse(raw)));
    writeLocalValue(
      currentStorageKey,
      parsedIds.size > 0 ? JSON.stringify(Array.from(parsedIds)) : null,
    );
    return parsedIds;
  } catch {
    return new Set<string>();
  }
};

export const setCardSetViewFlippedCardIds = ({
  deviceScope,
  cardSetId,
  ids,
}: CardSetViewFlippedFaceScope & {
  ids: ReadonlySet<string>;
}) => {
  if (!cardSetId) return;

  const normalizedIds = Array.from(ids).filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0,
  );

  writeLocalValue(
    buildCardSetViewFlippedFaceScopeKey({ deviceScope, cardSetId }),
    normalizedIds.length > 0 ? JSON.stringify(normalizedIds) : null,
  );
};
