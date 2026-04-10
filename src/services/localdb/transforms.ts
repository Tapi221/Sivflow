import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import {
  normalizeFolder,
  normalizeFolderWithSilent as normalizeFolderWithSilentBase,
} from "@/domain/folder/normalizers/normalizeFolder";
import type { Card, Folder } from "@/types";

type StorageLike = Record<string, unknown>;

const isRecord = (value: unknown): value is StorageLike => {
  return typeof value === "object" && value !== null;
};

/**
 * 現在の LocalDB / InMemoryLocalDB は Card をそのまま保持しているので、
 * storage 向け denormalize は実質 identity にする。
 * 旧 import を壊さないための互換 export。
 */
export const denormalizeCardForStorage = (
  value: Partial<Card> | StorageLike,
): StorageLike => {
  return isRecord(value) ? { ...value } : {};
};

/**
 * 現在の LocalDB / InMemoryLocalDB は Folder をそのまま保持しているので、
 * storage 向け denormalize は実質 identity にする。
 * 旧 import を壊さないための互換 export。
 */
export const denormalizeFolderForStorage = (
  value: Partial<Folder> | StorageLike,
): StorageLike => {
  return isRecord(value) ? { ...value } : {};
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
 * queries.ts が依存している export。
 */
export const normalizeFolderWithSilent = (value: unknown): Folder => {
  return normalizeFolderWithSilentBase(value);
};