import { resolveBlocksFromCardData, resolveExtraRowsFromCardData, resolveInkFromCardData } from "@/domain/card/normalizers/cardShape";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { cleanupLegacyCardStorageFields } from "./cardStorageFieldCleanup";
import { sanitizeCardStorageBlockImages } from "./cardStorageImageTransforms";
import { cloneStorageRecord, isStorageRecord } from "@/domain/shared/storage/storageRecordUtils";
import type { Card } from "@/types";



type StorageLike = Record<string, unknown>;



const denormalizeCardForStorage = (value: Partial<Card> | StorageLike): StorageLike => {
  const record = cloneStorageRecord(value);
  const frontBlocks = sanitizeCardStorageBlockImages(
    resolveBlocksFromCardData(record, "question"),
  );
  const backBlocks = sanitizeCardStorageBlockImages(
    resolveBlocksFromCardData(record, "answer"),
  );

  const frontBase = isStorageRecord(record.front) ? record.front : {};
  const backBase = isStorageRecord(record.back) ? record.back : {};

  record.front = {
    ...frontBase,
    blocks: frontBlocks,
    ink: resolveInkFromCardData(record, "question", { emptyInkAsNull: true }),
    extraRows: resolveExtraRowsFromCardData(record, "question"),
  };

  record.back = {
    ...backBase,
    blocks: backBlocks,
    ink: resolveInkFromCardData(record, "answer", { emptyInkAsNull: true }),
    extraRows: resolveExtraRowsFromCardData(record, "answer"),
  };

  return cleanupLegacyCardStorageFields(record);
};
const normalizeCardFromStorage = (value: unknown): Card => normalizeCard(value);



export { denormalizeCardForStorage, normalizeCardFromStorage };
