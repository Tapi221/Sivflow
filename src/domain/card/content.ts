import type { InkDocument } from "@/components/ink/inkTypes";
import type { CodeBlockData } from "@/types/core/code-block";
import type {
  Card,
  CardBlock,
  CardFace,
  UploadedImage,
} from "@/types/domain/card";

export type CardSide = "question" | "answer";

const EMPTY_BLOCKS: CardBlock[] = [];
const EMPTY_IMAGES: UploadedImage[] = [];
const EMPTY_AUDIOS: Array<{ url: string; filename: string; order: number }> =
  [];

export const getCardFace = (card: Card, side: CardSide) => {
  return side === "question" ? card.front : card.back;
};

export const getCardBlocks = (card: Card, side: CardSide) => {
  return getCardFace(card, side)?.blocks ?? EMPTY_BLOCKS;
};

export const getCardInk = (card: Card, side: CardSide) => {
  return getCardFace(card, side)?.ink ?? null;
};

export const getCardExtraRows = (card: Card, side: CardSide) => {
  return getCardFace(card, side)?.extraRows ?? 0;
};

export const extractCardTextFromBlocks = (blocks: CardBlock[]) => {
  for (const block of blocks) {
    if (block.type === "text" && typeof block.content === "string") {
      const content = block.content.trim();
      if (content) return content;
    }
    if (block.type === "markdown" && typeof block.markdown === "string") {
      const markdown = block.markdown.trim();
      if (markdown) return markdown;
    }
    if (block.type === "code" && typeof block.code?.code === "string") {
      const code = block.code.code.trim();
      if (code) return code.split("\n")[0]?.trim() ?? "";
    }
  }
  return "";
};

export const getCardText = (card: Card, side: CardSide) => {
  return extractCardTextFromBlocks(getCardBlocks(card, side));
};

export const getCardImages = (card: Card, side: CardSide) => {
  const images = getCardBlocks(card, side)
    .filter(
      (
        block,
      ): block is CardBlock & { type: "image"; images: UploadedImage[] } =>
        block.type === "image" && Array.isArray(block.images),
    )
    .flatMap((block) => block.images);
  return images.length > 0 ? images : EMPTY_IMAGES;
};

export const getCardAudios = (card: Card, side: CardSide) => {
  const audios = getCardBlocks(card, side)
    .filter(
      (
        block,
      ): block is CardBlock & {
        type: "audio";
        audios: Array<{ url: string; filename: string; order: number }>;
      } => block.type === "audio" && Array.isArray(block.audios),
    )
    .flatMap((block) => block.audios);
  return audios.length > 0 ? audios : EMPTY_AUDIOS;
};

export const getCardCode = (card: Card, side: CardSide) => {
  const codeBlock = getCardBlocks(card, side).find(
    (block): block is CardBlock & { type: "code"; code: CodeBlockData } =>
      block.type === "code" && !!block.code,
  );
  return codeBlock?.code ?? null;
};
