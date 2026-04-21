export { normalizeFolderWithSilent } from "@/domain/folder/normalizers/normalizeFolder";

export const denormalizeCardForStorage = <T extends Record<string, unknown>>(
  card: T,
): T => {
  return card;
};

export const denormalizeFolderForStorage = <T extends Record<string, unknown>>(
  folder: T,
): T => {
  return folder;
};
