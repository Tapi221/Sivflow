/**
 * Browser console / devtools 用のローカル移行補助スクリプト。
 * 既存 IndexedDB の cards を assetId 参照へ正規化する。
 */

import { normalizeCardImageRefs } from "@/domain/assets/cardImageRefNormalizer";
import { getLocalDb } from "@/services/localDB";

const migrateIndexedDbCardImages = async (userId: string) => {
  const db = await getLocalDb(userId);
  const cards = await db.cards.toArray();

  for (const card of cards) {
    const nextFrontBlocks = (card.front?.blocks ?? []).map(
      (block: Record<string, unknown>) => {
        if (block.type !== "image") return block;
        return {
          ...block,
          images: normalizeCardImageRefs(block.images ?? []),
        };
      },
    );

    const nextBackBlocks = (card.back?.blocks ?? []).map(
      (block: Record<string, unknown>) => {
        if (block.type !== "image") return block;
        return {
          ...block,
          images: normalizeCardImageRefs(block.images ?? []),
        };
      },
    );

    await db.cards.update(card.id, {
      front: {
        ...(card.front ?? {}),
        blocks: nextFrontBlocks,
      },
      back: {
        ...(card.back ?? {}),
        blocks: nextBackBlocks,
      },
      updatedAt: new Date(),
    });
  }
};

export default migrateIndexedDbCardImages;
