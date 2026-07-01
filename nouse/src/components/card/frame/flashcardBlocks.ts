/**
 * Flashcard の fallback blocks 生成ロジック
 *
 * - frontBlocks/backBlocks がある場合はそちらを優先
 * - ない場合は legacy テキスト/コード/音声フィールドから生成
 * - legacy 画像フィールドは右上メディアダイアログ表示専用として扱い、
 *   本文ブロックには自動挿入しない
 */
import { sortBlocksByOrderIndex } from "@/components/card/blocks/core/blockOrdering";
import type { FlashcardMediaLike } from "./flashcard.types";
import type { CardBlock } from "@/types/domain/card";



interface SideData {
  blocks: CardBlock[];
  text: string;
  audios: FlashcardMediaLike[];
  code: { code?: string; language?: string; } | null;
}



const resolveSideBlocks = (side: "question" | "answer", data: SideData) => {
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

  if ((data.audios?.length ?? 0) > 0) {
    fallbackBlocks.push({
      id: `${side}-legacy-audio`,
      type: "audio",
      orderIndex,
      audios: data.audios as unknown as CardBlock["audios"],
    } as CardBlock);
  }

  return fallbackBlocks;
};



export { resolveSideBlocks };
