import type { InkDocument } from "@/components/ink/inkTypes";
import type { CodeBlockData } from "@/types/core/code-block";
import type { Card, CardBlock, CardFace, UploadedImage } from "@/types/domain/card";

export type CardSide = "question" | "answer";

const EMPTY_BLOCKS: CardBlock[] = [];
const EMPTY_IMAGES: UploadedImage[] = [];
const EMPTY_AUDIOS: Array<{ url: string; filename: string; order: number }> = [];

export function getCardFace(card: Card, side: CardSide): CardFace {
  return side === "question" ? card.front : card.back;
}

export function getCardBlocks(card: Card, side: CardSide): CardBlock[] {
  return getCardFace(card, side)?.blocks ?? EMPTY_BLOCKS;
}

export function getCardInk(
  card: Card,
  side: CardSide,
): InkDocument | null {
  return getCardFace(card, side)?.ink ?? null;
}

export function getCardExtraRows(card: Card, side: CardSide): number {
  return getCardFace(card, side)?.extraRows ?? 0;
}

export function extractCardTextFromBlocks(blocks: CardBlock[]): string {
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
}

export function getCardText(card: Card, side: CardSide): string {
  return extractCardTextFromBlocks(getCardBlocks(card, side));
}

export function getCardImages(card: Card, side: CardSide): UploadedImage[] {
  const images = getCardBlocks(card, side)
    .filter((block): block is CardBlock & { type: "image"; images: UploadedImage[] } =>
      block.type === "image" && Array.isArray(block.images),
    )
    .flatMap((block) => block.images);
  return images.length > 0 ? images : EMPTY_IMAGES;
}

export function getCardAudios(
  card: Card,
  side: CardSide,
): Array<{ url: string; filename: string; order: number }> {
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
}

export function getCardCode(
  card: Card,
  side: CardSide,
): CodeBlockData | null {
  const codeBlock = getCardBlocks(card, side).find(
    (block): block is CardBlock & { type: "code"; code: CodeBlockData } =>
      block.type === "code" && !!block.code,
  );
  return codeBlock?.code ?? null;
}

