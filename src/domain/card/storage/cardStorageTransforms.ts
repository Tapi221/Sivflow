import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import {
  resolveBlocksFromCardData,
  resolveExtraRowsFromCardData,
  resolveInkFromCardData,
} from "@/domain/card/normalizers/cardShape";
import { cloneStorageRecord, isStorageRecord } from "@/domain/shared/storage/storageRecordUtils";
import type { Card } from "@/types";

type StorageLike = Record<string, unknown>;

export const denormalizeCardForStorage = (
  value: Partial<Card> | StorageLike,
): StorageLike => {
  const record = cloneStorageRecord(value);

  const sanitizeLayout = (layoutValue: unknown) => {
    if (!isStorageRecord(layoutValue)) return null;

    const readNumber = (key: string) => {
      const candidate = layoutValue[key];
      return typeof candidate === "number" && Number.isFinite(candidate)
        ? candidate
        : null;
    };

    return {
      baseWidthPx: readNumber("baseWidthPx"),
      cropX: readNumber("cropX"),
    };
  };

  const sanitizeImageRef = (imageValue: unknown) => {
    if (!isStorageRecord(imageValue)) return imageValue;

    const readString = (key: string) => {
      const candidate = imageValue[key];
      return typeof candidate === "string" ? candidate : null;
    };

    const readNumber = (key: string) => {
      const candidate = imageValue[key];
      return typeof candidate === "number" && Number.isFinite(candidate)
        ? candidate
        : null;
    };

    const assetId = readString("assetId") ?? readString("id");
    const remoteUrl = readString("remoteUrl");
    const normalizedRemoteUrl =
      remoteUrl && remoteUrl.startsWith("http") ? remoteUrl : null;

    return {
      id: readString("id") ?? assetId,
      assetId,
      localFileId: readString("localFileId") ?? assetId,
      remoteUrl: normalizedRemoteUrl,
      storagePath: readString("storagePath"),
      status:
        readString("status") ?? (normalizedRemoteUrl ? "ready" : "uploading"),
      error: readString("error") ?? undefined,
      scale: readNumber("scale") ?? 1,
      x: readNumber("x") ?? 0,
      layout: sanitizeLayout(imageValue.layout),
      naturalW: readNumber("naturalW"),
      naturalH: readNumber("naturalH"),
    };
  };

  const sanitizeBlockImages = (blocks: unknown[] | undefined) => {
    if (!Array.isArray(blocks)) return blocks;

    return blocks.map((block) => {
      if (!isStorageRecord(block) || !Array.isArray(block.images)) return block;

      return {
        ...block,
        images: block.images.map((image) => sanitizeImageRef(image)),
      };
    });
  };

  const frontBlocks = sanitizeBlockImages(
    resolveBlocksFromCardData(record, "question"),
  );
  const backBlocks = sanitizeBlockImages(
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

  delete record.questionBlocks;
  delete record.answerBlocks;
  delete record.frontBlocks;
  delete record.backBlocks;
  delete record.questionText;
  delete record.answerText;
  delete record.questionImages;
  delete record.answerImages;
  delete record.questionAudios;
  delete record.answerAudios;
  delete record.questionCode;
  delete record.answerCode;
  delete record.questionMarked;
  delete record.answerMarked;
  delete record.questionTextHighlighted;
  delete record.answerTextHighlighted;
  delete record.inkQuestion;
  delete record.inkAnswer;
  delete record.questionExtraRows;
  delete record.answerExtraRows;
  delete record.question_extra_rows;
  delete record.answer_extra_rows;

  return record;
};

export const normalizeCardFromStorage = (value: unknown): Card =>
  normalizeCard(value);
