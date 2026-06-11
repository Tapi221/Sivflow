import type { CardBlock } from "@/types/domain/card";



type BlockType = CardBlock["type"];



const RULED_BLOCK_TYPES: ReadonlySet<BlockType> = new Set(["text", "markdown"]);



const hasRuledLine = (blockType: BlockType): boolean => {
  return RULED_BLOCK_TYPES.has(blockType);
};
const shouldRenderInterBlockSeparator = (prevBlockType: BlockType, nextBlockType: BlockType): boolean => {
  return !hasRuledLine(prevBlockType) && !hasRuledLine(nextBlockType);
};



export { hasRuledLine, shouldRenderInterBlockSeparator };
