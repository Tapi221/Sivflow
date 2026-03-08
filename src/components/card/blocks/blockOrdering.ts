import type { CardBlock } from "@/types";

export function sortBlocksByOrderIndex(blocks: CardBlock[] = []): CardBlock[] {
  return [...blocks].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
}



