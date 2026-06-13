import type { CardBlock } from "@/types/domain/card";



const sortBlocksByOrderIndex = (blocks: CardBlock[] = []) => {
  if (blocks.length <= 1) return blocks;

  let previous = blocks[0]?.orderIndex ?? 0;
  for (let index = 1; index < blocks.length; index += 1) {
    const current = blocks[index]?.orderIndex ?? 0;
    if (current < previous) {
      return [...blocks].sort(
        (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
      );
    }
    previous = current;
  }

  // 既に昇順なら参照を維持して不要な配列再生成を避ける
  return blocks;
};



export { sortBlocksByOrderIndex };
