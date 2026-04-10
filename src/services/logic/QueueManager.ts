import { normalizeFolderWithSilent } from "@/domain/folder/normalizers/normalizeFolder";
import {
  resolveBlocksFromCardData,
  resolveExtraRowsFromCardData,
  resolveInkFromCardData,
} from "@/domain/card/normalizers/cardShape";

export { normalizeFolderWithSilent };

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const readString = (
  value: Record<string, unknown>,
  key: string,
): string | null => {
  const candidate = value[key];
  return typeof candidate === "string" ? candidate : null;
};

const readNumber = (
  value: Record<string, unknown>,
  key: string,
): number | null => {
  const candidate = value[key];
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? candidate
    : null;
};

const sanitizeLayout = (value: unknown) => {
  if (!isRecord(value)) return null;

  return {
    baseWidthPx: readNumber(value, "baseWidthPx"),
    cropX: readNumber(value, "cropX"),
  };
};

const sanitizeImageRef = (value: unknown) => {
  if (!isRecord(value)) return value;

  const assetId = readString(value, "assetId") ?? readString(value, "id");
  const remoteUrl = readString(value, "remoteUrl");
  const normalizedRemoteUrl =
    remoteUrl && remoteUrl.startsWith("http") ? remoteUrl : null;

  return {
    id: readString(value, "id") ?? assetId,
    assetId,
    localFileId: readString(value, "localFileId") ?? assetId,
    remoteUrl: normalizedRemoteUrl,
    storagePath: readString(value, "storagePath"),
    status:
      readString(value, "status") ??
      (normalizedRemoteUrl ? "ready" : "uploading"),
    error: readString(value, "error") ?? undefined,
    scale: readNumber(value, "scale") ?? 1,
    x: readNumber(value, "x") ?? 0,
    layout: sanitizeLayout(value.layout),
    naturalW: readNumber(value, "naturalW"),
    naturalH: readNumber(value, "naturalH"),
  };
};

const sanitizeBlockImages = (blocks: unknown[] | undefined) => {
  if (!Array.isArray(blocks)) return blocks;

  return blocks.map((block) => {
    if (!isRecord(block)) return block;
    if (!Array.isArray(block.images)) return block;

    return {
      ...block,
      images: block.images.map((image) => sanitizeImageRef(image)),
    };
  });
};

export const denormalizeCardForStorage = <T>(card: T): T => {
  if (!isRecord(card)) return card;

  const result: Record<string, unknown> = { ...card };

  const frontBlocks = sanitizeBlockImages(
    resolveBlocksFromCardData(result, "question"),
  );
  const backBlocks = sanitizeBlockImages(
    resolveBlocksFromCardData(result, "answer"),
  );

  const frontBase = isRecord(result.front) ? result.front : {};
  const backBase = isRecord(result.back) ? result.back : {};

  result.front = {
    ...frontBase,
    blocks: frontBlocks,
    ink: resolveInkFromCardData(result, "question", { emptyInkAsNull: true }),
    extraRows: resolveExtraRowsFromCardData(result, "question"),
  };

  result.back = {
    ...backBase,
    blocks: backBlocks,
    ink: resolveInkFromCardData(result, "answer", { emptyInkAsNull: true }),
    extraRows: resolveExtraRowsFromCardData(result, "answer"),
  };

  delete result.questionBlocks;
  delete result.answerBlocks;
  delete result.frontBlocks;
  delete result.backBlocks;
  delete result.questionText;
  delete result.answerText;
  delete result.questionImages;
  delete result.answerImages;
  delete result.questionAudios;
  delete result.answerAudios;
  delete result.questionCode;
  delete result.answerCode;
  delete result.questionMarked;
  delete result.answerMarked;
  delete result.questionTextHighlighted;
  delete result.answerTextHighlighted;
  delete result.inkQuestion;
  delete result.inkAnswer;
  delete result.questionExtraRows;
  delete result.answerExtraRows;
  delete result.question_extra_rows;
  delete result.answer_extra_rows;

  return result as T;
};

export const denormalizeFolderForStorage = <T>(folder: T): T => {
  if (!isRecord(folder)) return folder;
  return { ...folder } as T;
};
