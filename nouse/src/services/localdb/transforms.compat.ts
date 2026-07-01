

const denormalizeCardForStorage = <T extends Record<string, unknown>>(card: T): T => {
  return card;
};
const denormalizeFolderForStorage = <T extends Record<string, unknown>>(folder: T): T => {
  return folder;
};



export { normalizeFolderWithSilent } from "@/domain/folder/normalizers/normalizeFolder";
export { denormalizeCardForStorage, denormalizeFolderForStorage };
