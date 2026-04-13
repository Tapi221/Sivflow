import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import {
  resolveBlocksFromCardData,
  resolveExtraRowsFromCardData,
  resolveInkFromCardData,
} from "@/domain/card/normalizers/cardShape";
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
  const record = cloneRecord(value);

  const sanitizeLayout = (layoutValue: unknown) => {
    if (!isRecord(layoutValue)) return null;

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
    if (!isRecord(imageValue)) return imageValue;

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
      if (!isRecord(block) || !Array.isArray(block.images)) return block;

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

  const frontBase = isRecord(record.front) ? record.front : {};
  const backBase = isRecord(record.back) ? record.back : {};

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
