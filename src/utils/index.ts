// TODO: remove these compatibility re-exports after remaining callers migrate.
export { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
export {
  normalizeFolder,
  normalizeFolderWithSilent,
} from "@/domain/folder/normalizers/normalizeFolder";
export { createPageUrl } from "@/platform/web/navigation/toWebPath";
