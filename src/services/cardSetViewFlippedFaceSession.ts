import { SHARED_STORAGE_KEYS } from "@constants/shared/storage";

type CardSetViewFlippedFaceScope = {
  cardSetId: string | null | undefined;
  folderId: string | null | undefined;
};

const buildStorageKey = ({
  cardSetId,
  folderId,
}: CardSetViewFlippedFaceScope) => {
  return [
    SHARED_STORAGE_KEYS.cardSetViewFlippedFacePrefix,
    cardSetId ?? "__no_card_set__",
    folderId ?? "__no_folder__",
  ].join(":");
};

const readSessionValue = (key: string) => {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeSessionValue = (key: string, value: string | null) => {
  if (typeof window === "undefined") return;

  try {
    if (value == null) {
      window.sessionStorage.removeItem(key);
      return;
    }

    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore session persistence failures and keep in-memory state working.
  }
};

const normalizeCardIdList = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0,
  );
};

export const getCardSetViewFlippedCardIds = ({
  cardSetId,
  folderId,
}: CardSetViewFlippedFaceScope) => {
  if (!cardSetId && !folderId) return new Set<string>();

  const raw = readSessionValue(buildStorageKey({ cardSetId, folderId }));
  if (!raw) return new Set<string>();

  try {
    return new Set<string>(normalizeCardIdList(JSON.parse(raw)));
  } catch {
    return new Set<string>();
  }
};

export const setCardSetViewFlippedCardIds = ({
  cardSetId,
  folderId,
  ids,
}: CardSetViewFlippedFaceScope & {
  ids: ReadonlySet<string>;
}) => {
  if (!cardSetId && !folderId) return;

  const normalizedIds = Array.from(ids).filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0,
  );

  writeSessionValue(
    buildStorageKey({ cardSetId, folderId }),
    normalizedIds.length > 0 ? JSON.stringify(normalizedIds) : null,
  );
};
