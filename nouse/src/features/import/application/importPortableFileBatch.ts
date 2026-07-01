import { importMfCardFile } from "@/features/cardFile/application/importMfCard";
import { readMfCardFile } from "@/features/cardFile/infra/web/readMfCardFile";
import type { CreateMfDeckCard, CreateMfDeckCardSet, EnsureMfDeckTagByName, ImportMfDeckArchiveResult, UpdateMfDeckCardSet } from "@/features/deckFile/application/importMfDeck";
import { importMfDeckArchive } from "@/features/deckFile/application/importMfDeck";
import { readMfDeckFile } from "@/features/deckFile/infra/web/readMfDeckFile";
import type { PortableImportFileKind } from "@/features/import/domain/importFileKind";
import { detectImportFileKind, IMPORT_FILE_LABELS, isPortableImportFileKind } from "@/features/import/domain/importFileKind";



type PortableImportBatchItemStatus = | "queued" | "parsing" | "importing" | "imported" | "failed" | "skipped";
type PortableImportBatchItem = {
  id: string;
  file: File;
  kind: PortableImportFileKind;
  name: string;
  size: number;
  status: PortableImportBatchItemStatus;
  createdCardSetId?: string;
  createdCardSetName?: string;
  createdCount?: number;
  warningCount?: number;
  errorMessage?: string;
};
type PortableImportBatchResult = {
  items: PortableImportBatchItem[];
  importedCount: number;
  failedCount: number;
  skippedCount: number;
  createdCardCount: number;
  lastImportedCardSetId: string | null;
  lastImportedCardSetName: string | null;
};
type ImportPortableFileBatchParams = {
  files: File[];
  folderId: string;
  createCardSet: CreateMfDeckCardSet;
  updateCardSet?: UpdateMfDeckCardSet;
  createCard: CreateMfDeckCard;
  ensureTagByName?: EnsureMfDeckTagByName;
  onItemChange?: (item: PortableImportBatchItem) => void;
};



const genId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};
const formatFileSize = (size: number): string => {
  if (!Number.isFinite(size) || size < 0) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};
const cloneItem = (item: PortableImportBatchItem): PortableImportBatchItem => ({
  ...item,
});
const buildPortableImportBatchItems = (files: File[]): PortableImportBatchItem[] => {
  const seen = new Set<string>();
  const items: PortableImportBatchItem[] = [];

  for (const file of files) {
    const kind = detectImportFileKind(file);
    const key = `${file.name}__${file.size}__${file.lastModified}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    if (!isPortableImportFileKind(kind)) {
      continue;
    }

    items.push({
      id: genId(),
      file,
      kind,
      name: file.name,
      size: file.size,
      status: "queued",
    });
  }

  return items;
};
const getSuggestedCardSetName = (result: ImportMfDeckArchiveResult): string => {
  return result.createdCardSetName.trim() ?? "無題のカードセット";
};
const importMfDeckItem = async ({
  item,
  folderId,
  createCardSet,
  updateCardSet,
  createCard,
  ensureTagByName,
}: Omit<ImportPortableFileBatchParams, "files" | "onItemChange"> & {
  item: PortableImportBatchItem;
}) => {
  const loaded = await readMfDeckFile(item.file);

  if (!loaded.archive) {
    const errorIssue = loaded.issues.find((issue) => issue.level === "error");
    throw new Error(errorIssue?.message ?? "MFDeck を解析できませんでした。");
  }

  const cardSetName = loaded.suggestedCardSetName.trim();

  return importMfDeckArchive({
    archive: loaded.archive,
    folderId,
    createCardSet,
    updateCardSet,
    createCard,
    ensureTagByName,
    destination: {
      kind: "new-card-set",
      cardSetName,
    },
  });
};
const importMfCardItem = async ({
  item,
  folderId,
  createCardSet,
  updateCardSet,
  createCard,
  ensureTagByName,
}: Omit<ImportPortableFileBatchParams, "files" | "onItemChange"> & {
  item: PortableImportBatchItem;
}) => {
  const loaded = await readMfCardFile(item.file);

  if (!loaded.cardFile) {
    const errorIssue = loaded.issues.find((issue) => issue.level === "error");
    throw new Error(errorIssue?.message ?? "MFCard を解析できませんでした。");
  }

  const cardSetName = loaded.suggestedCardSetName.trim();

  return importMfCardFile({
    cardFile: loaded.cardFile,
    folderId,
    createCardSet,
    updateCardSet,
    createCard,
    ensureTagByName,
    destination: {
      kind: "new-card-set",
      cardSetName,
    },
  });
};
const emitItem = (
  item: PortableImportBatchItem,
  onItemChange: ImportPortableFileBatchParams["onItemChange"],
) => {
  onItemChange?.(cloneItem(item));
};
const importPortableFileBatch = async ({ files, folderId, createCardSet, updateCardSet, createCard, ensureTagByName, onItemChange }: ImportPortableFileBatchParams): Promise<PortableImportBatchResult> => {
  const items = buildPortableImportBatchItems(files);
  let importedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let createdCardCount = 0;
  let lastImportedCardSetId: string | null = null;
  let lastImportedCardSetName: string | null = null;

  for (const item of items) {
    if (!folderId) {
      item.status = "skipped";
      item.errorMessage = "インポート先フォルダが選択されていません。";
      skippedCount += 1;
      emitItem(item, onItemChange);
      continue;
    }

    try {
      item.status = "parsing";
      emitItem(item, onItemChange);

      item.status = "importing";
      emitItem(item, onItemChange);

      const result =
        item.kind === "mfdeck"
          ? await importMfDeckItem({
            item,
            folderId,
            createCardSet,
            updateCardSet,
            createCard,
            ensureTagByName,
          })
          : await importMfCardItem({
            item,
            folderId,
            createCardSet,
            updateCardSet,
            createCard,
            ensureTagByName,
          });

      item.status = "imported";
      item.createdCardSetId = result.createdCardSetId;
      item.createdCardSetName = getSuggestedCardSetName(result);
      item.createdCount = result.createdCount;
      item.warningCount = result.issues.filter(
        (issue) => issue.level === "warning",
      ).length;

      importedCount += 1;
      createdCardCount += result.createdCount;
      lastImportedCardSetId = result.createdCardSetId;
      lastImportedCardSetName = item.createdCardSetName;
      emitItem(item, onItemChange);
    } catch (error) {
      item.status = "failed";
      item.errorMessage =
        error instanceof Error ? error.message : "不明なエラー";
      failedCount += 1;
      emitItem(item, onItemChange);
    }
  }

  return {
    items: items.map(cloneItem),
    importedCount,
    failedCount,
    skippedCount,
    createdCardCount,
    lastImportedCardSetId,
    lastImportedCardSetName,
  };
};
const formatPortableImportBatchItemSubtitle = (item: Pick<PortableImportBatchItem, "kind" | "size">): string => {
  return `${IMPORT_FILE_LABELS[item.kind]} / ${formatFileSize(item.size)}`;
};



export { buildPortableImportBatchItems, importPortableFileBatch, formatPortableImportBatchItemSubtitle };


export type { PortableImportBatchItemStatus, PortableImportBatchItem, PortableImportBatchResult, ImportPortableFileBatchParams };
