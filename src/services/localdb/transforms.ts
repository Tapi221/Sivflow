import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import type { Card, Folder } from "@/types";

type StorageLike = Record<string, unknown>;

const isRecord = (value: unknown): value is StorageLike => {
  return typeof value === "object" && value !== null;
};

const cloneRecord = (value: unknown): StorageLike => {
  return isRecord(value) ? { ...value } : {};
};

export const denormalizeCardForStorage = (
  value: Partial<Card> | StorageLike,
): StorageLike => {
  return cloneRecord(value);
};

export const denormalizeFolderForStorage = (
  value: Partial<Folder> | StorageLike,
): StorageLike => {
  return cloneRecord(value);
};

export const normalizeCardFromStorage = (value: unknown): Card => {
  return normalizeCard(value);
};

export const normalizeFolderFromStorage = (value: unknown): Folder => {
  return normalizeFolder(value);
};

export const normalizeFolderWithSilent = (value: unknown): Folder => {
  if (!isRecord(value)) {
    return normalizeFolder(value);
  }

  const hasSilent = "silent" in value && value.silent !== undefined;
  const hasIsSilent =
    ("isSilent" in value && value.isSilent !== undefined) ||
    ("is_silent" in value && value.is_silent !== undefined);

  const normalizedInput =
    !hasIsSilent && hasSilent ? { ...value, isSilent: value.silent } : value;

  return normalizeFolder(normalizedInput);
};
