import { normalizeFolder } from "@/utils";
import { normalizeInkDocument } from "@/components/ink/inkTypes";

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

  const resolveBlocks = (
    value: Record<string, unknown>,
    side: "question" | "answer",
  ) => {
    const legacyKey = side === "question" ? "questionBlocks" : "answerBlocks";
    const aliasKey = side === "question" ? "frontBlocks" : "backBlocks";
    const faceKey = side === "question" ? "front" : "back";
    const face = value[faceKey];
    if (
      face &&
      typeof face === "object" &&
      Array.isArray((face as { blocks?: unknown[] }).blocks)
    ) {
      return (face as { blocks: unknown[] }).blocks;
    }
    if (Array.isArray(value[aliasKey])) return value[aliasKey] as unknown[];
    if (Array.isArray(value[legacyKey])) return value[legacyKey] as unknown[];
    return [];
  };

  const resolveInk = (
    value: Record<string, unknown>,
    side: "question" | "answer",
  ) => {
    const legacyKey = side === "question" ? "inkQuestion" : "inkAnswer";
    const faceKey = side === "question" ? "front" : "back";
    const face = value[faceKey];
    const faceInk =
      face && typeof face === "object" ? (face as { ink?: unknown }).ink : undefined;
    const doc = normalizeInkDocument(faceInk ?? value[legacyKey] ?? null);
    return doc.strokes.length > 0 ? doc : null;
  };

  const resolveExtraRows = (
    value: Record<string, unknown>,
    side: "question" | "answer",
  ) => {
    const legacyKey = side === "question" ? "questionExtraRows" : "answerExtraRows";
    const snakeKey =
      side === "question" ? "question_extra_rows" : "answer_extra_rows";
    const faceKey = side === "question" ? "front" : "back";
    const face = value[faceKey];
    const faceExtraRows =
      face && typeof face === "object"
        ? (face as { extraRows?: unknown }).extraRows
        : undefined;
    const parsed = Number(faceExtraRows ?? value[legacyKey] ?? value[snakeKey] ?? 0);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
  };

  const frontBlocks = sanitizeBlockImages(resolveBlocks(result, "question"));
  const backBlocks = sanitizeBlockImages(resolveBlocks(result, "answer"));

  result.front = {
    ...(result.front && typeof result.front === "object" ? result.front : {}),
    blocks: frontBlocks,
    ink: resolveInk(result, "question"),
    extraRows: resolveExtraRows(result, "question"),
  };
  result.back = {
    ...(result.back && typeof result.back === "object" ? result.back : {}),
    blocks: backBlocks,
    ink: resolveInk(result, "answer"),
    extraRows: resolveExtraRows(result, "answer"),
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

export const normalizeFolderWithSilent = (raw: unknown) => {
  if (!raw) return raw;
  const hasSilent = raw?.silent !== undefined;
  const hasIsSilent =
    raw?.isSilent !== undefined || raw?.is_silent !== undefined;
  const normalizedInput =
    !hasIsSilent && hasSilent ? { ...raw, isSilent: raw.silent } : raw;
  return normalizeFolder(normalizedInput);
};

