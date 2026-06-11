type BlockLayoutKind = "ruled" | "non-ruled";
interface MeasuredBlock {
  kind: BlockLayoutKind;
  /** y position relative to CardSurface top */
  top: number;
  height: number;
}
interface CardFaceLayout {
  /** y positions (CardSurface-relative) where ruled lines should be drawn */
  visibleRules: number[];
  usedHeight: number;
  bottomSlackPx: number;
}



const buildCardFaceLayout = (
  blocks: MeasuredBlock[],
  ruledTop: number,
  ruledBottom: number,
  rowPx: number,
) => {
  const usedHeight =
    blocks.length > 0
      ? Math.max(...blocks.map((b) => b.top + b.height))
      : ruledTop;

  const visibleRules: number[] = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.kind !== "ruled") continue;

    const rawStart = Math.max(ruledTop, block.top);
    const rawEnd = i + 1 < blocks.length ? blocks[i + 1].top : ruledBottom;

    const start = Math.ceil(rawStart / rowPx) * rowPx;
    const end = Math.floor(rawEnd / rowPx) * rowPx;

    for (let y = start; y <= end; y += rowPx) {
      visibleRules.push(y);
    }
  }

  const deduped = [...new Set(visibleRules)].sort((a, b) => a - b);
  const lastVisibleRule =
    deduped.length > 0 ? deduped[deduped.length - 1] : ruledTop;

  return {
    visibleRules: deduped,
    usedHeight,
    bottomSlackPx: Math.max(
      0,
      ruledBottom - Math.max(usedHeight, lastVisibleRule),
    ),
  };
};



export { buildCardFaceLayout };


export type { BlockLayoutKind, CardFaceLayout, MeasuredBlock };
