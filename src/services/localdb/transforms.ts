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

/**
 * 現在の LocalDB / InMemoryLocalDB は Card をそのまま保持しているので、
 * storage 向け denormalize は実質 identity。
 * 旧 import 互換のために export を残す。
 */
export const denormalizeCardForStorage = (
  value: Partial<Card> | StorageLike,
): StorageLike => {
  return cloneRecord(value);
};

/**
 * 現在の LocalDB / InMemoryLocalDB は Folder をそのまま保持しているので、
 * storage 向け denormalize は実質 identity。
 * 旧 import 互換のために export を残す。
 */
export const denormalizeFolderForStorage = (
  value: Partial<Folder> | StorageLike,
): StorageLike => {
  return cloneRecord(value);
};

/**
 * storage -> domain 正規化
 */
export const normalizeCardFromStorage = (value: unknown): Card => {
  return normalizeCard(value);
};

/**
 * storage -> domain 正規化
 */
export const normalizeFolderFromStorage = (value: unknown): Folder => {
  return normalizeFolder(value);
};

/**
 * silent / isSilent / is_silent の差異を吸収した Folder 正規化。
 * queries.ts 互換 export。
 */
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