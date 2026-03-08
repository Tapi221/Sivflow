/**
 * Flashcard の fallback blocks 生成ロジック
 *
 * - questionBlocks/answerBlocks がある場合はそちらを優先
 * - ない場合は legacy テキスト/コード/画像/音声フィールドから生成
 */
import type { CardBlock } from "@/types";
import { sortBlocksByOrderIndex } from "../blocks/blockOrdering";
import type { FlashcardMediaLike } from "./flashcardDerived";

interface SideData {
  blocks: CardBlock[];
  text: string;
  imageUrls: string[];
  audios: FlashcardMediaLike[];
  code: { code?: string; language?: string } | null;
}

export function resolveSideBlocks(
  side: "question" | "answer",
  data: SideData,
): CardBlock[] {
  if (data.blocks.length > 0) {
    return sortBlocksByOrderIndex(data.blocks);
  }

  const fallbackBlocks: CardBlock[] = [];
  let orderIndex = 0;

  if ((data.text ?? "").trim() !== "") {
    fallbackBlocks.push({
      id: `${side}-legacy-text`,
      type: "text",
      orderIndex: orderIndex++,
      content: String(data.text),
    } as CardBlock);
  }

  if ((data.code?.code ?? "").trim() !== "") {
    fallbackBlocks.push({
      id: `${side}-legacy-code`,
      type: "code",
      orderIndex: orderIndex++,
      code: data.code,
    } as CardBlock);
  }

  if ((data.imageUrls?.length ?? 0) > 0) {
    fallbackBlocks.push({
      id: `${side}-legacy-image`,
      type: "image",
      orderIndex: orderIndex++,
      images: data.imageUrls as unknown as CardBlock["images"],
    } as CardBlock);
  }

  if ((data.audios?.length ?? 0) > 0) {
    fallbackBlocks.push({
      id: `${side}-legacy-audio`,
      type: "audio",
      orderIndex,
      audios: data.audios as unknown as CardBlock["audios"],
    } as CardBlock);
  }

  return fallbackBlocks;
}
