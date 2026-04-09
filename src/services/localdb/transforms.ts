import { normalizeFolderWithSilent } from "@/domain/folder/normalizers/normalizeFolder";
import {
  resolveBlocksFromCardData,
  resolveExtraRowsFromCardData,
  resolveInkFromCardData,
} from "@/domain/card/normalizers/cardShape";

export { normalizeFolderWithSilent };

export const denormalizeCardForStorage = (card: unknown) => {
  if (!card) return card;
  const result = { ...card };

  const sanitizeBlockImages = (blocks: unknown[] | undefined) => {
    if (!Array.isArray(blocks)) return blocks;
    return blocks.map((block) => {
      if (!block || typeof block !== "object") return block;
      const blockRecord = block as Record<string, unknown>;
      if (!Array.isArray(blockRecord.images)) return block;
      const sanitizedImages = (blockRecord.images as unknown[]).map(
        (img: unknown) => {
          if (!img || typeof img !== "object") return img;
          const assetId = img.assetId ?? img.id ?? null;
          const remoteUrl =
            typeof img.remoteUrl === "string" &&
            img.remoteUrl.startsWith("http")
              ? img.remoteUrl
              : null;
          return {
            id: img.id ?? assetId,
            assetId,
            localFileId: img.localFileId ?? assetId,
            remoteUrl,
            storagePath: img.storagePath ?? null,
            status: img.status ?? (remoteUrl ? "ready" : "uploading"),
            error: img.error ?? undefined,
            scale: img.scale ?? 1,
            x: img.x ?? 0,
            layout:
              img.layout && typeof img.layout === "object"
                ? {
                    baseWidthPx:
                      typeof img.layout.baseWidthPx === "number"
                        ? img.layout.baseWidthPx
                        : null,
                    cropX:
                      typeof img.layout.cropX === "number"
                        ? img.layout.cropX
                        : null,
                  }
                : null,
            naturalW: img.naturalW ?? null,
            naturalH: img.naturalH ?? null,
          };
        },
      );
      return { ...block, images: sanitizedImages };
    });
  };

  const frontBlocks = sanitizeBlockImages(
    resolveBlocksFromCardData(result, "question"),
  );
  const backBlocks = sanitizeBlockImages(
    resolveBlocksFromCardData(result, "answer"),
  );

  result.front = {
    ...(result.front && typeof result.front === "object" ? result.front : {}),
    blocks: frontBlocks,
    ink: resolveInkFromCardData(result, "question", { emptyInkAsNull: true }),
    extraRows: resolveExtraRowsFromCardData(result, "question"),
  };
  result.back = {
    ...(result.back && typeof result.back === "object" ? result.back : {}),
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

  return result;
};

export const denormalizeFolderForStorage = (folder: unknown) => {
  if (!folder) return folder;
  return { ...folder };
};
