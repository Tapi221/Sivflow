import type { CardBlock } from "@/types/domain/card";



const isRenderableCardBlock = (block: CardBlock): boolean => {
  switch (block.type) { case "text": return (block.content ?? "").trim() !== "";
    case "question":
      return (
        (block.questionTitle ?? "").trim() !== "" ||
        (block.questionAnswer ?? "").trim() !== ""
      );
    case "code":
      return (block.code?.code ?? "").trim() !== "";
    case "image":
      return (block.images?.length ?? 0) > 0;
    case "pdf":
      return Boolean(block.pdf);
    case "audio":
      return (block.audios?.length ?? 0) > 0;
    case "math":
      return (block.math?.latex ?? "").trim() !== "";
    case "markdown":
      return (block.markdown ?? "").trim() !== "";
    default:
      return false;
  }
};
const filterRenderableCardBlocks = (blocks?: readonly CardBlock[] | null): CardBlock[] => {
  if (!blocks || blocks.length === 0) return [];
  return blocks.filter(isRenderableCardBlock);
};



export { isRenderableCardBlock, filterRenderableCardBlocks };
