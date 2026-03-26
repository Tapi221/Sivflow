export type BlockLayoutKind = "normal" | "special";

export interface MeasuredBlock {
  kind: BlockLayoutKind;
  /** y position relative to CardSurface top */
  top: number;
  height: number;
}

export interface CardFaceLayout {
  /** y positions (CardSurface-relative) where ruled lines should be drawn */
  visibleRules: number[];
  usedHeight: number;
  bottomSlackPx: number;
}

const SPECIAL_GUARD_PX = 4;

/**
 * Builds the list of visible ruled line positions for a card face.
 *
 * Rules:
 * - Lines are at every `rowPx` interval starting from `ruledTop`
 * - Lines within SPECIAL_GUARD_PX of a special block (exclusive) are suppressed
 * - A line at exactly blockTop - SPECIAL_GUARD_PX or blockBottom + SPECIAL_GUARD_PX IS visible
 *
 * @param blocks - measured block positions in CardSurface-relative coordinates
 * @param ruledTop - y of first candidate ruled line (CARD_RULED_OFFSET_TOP_PX)
 * @param ruledBottom - y of last candidate ruled line (cardHeight - CARD_RULED_OFFSET_BOTTOM_PX)
 * @param rowPx - ruled line pitch (CARD_ROW_PX = 24)
 */
export function buildCardFaceLayout(
  blocks: MeasuredBlock[],
  ruledTop: number,
  ruledBottom: number,
  rowPx: number,
): CardFaceLayout {
  const allRules: number[] = [];
  for (let y = ruledTop; y <= ruledBottom + 0.5; y += rowPx) {
    allRules.push(Math.round(y));
  }

  const visibleRules = allRules.filter(
    (y) =>
      !blocks.some(
        (b) =>
          b.kind === "special" &&
          y > b.top - SPECIAL_GUARD_PX &&
          y < b.top + b.height + SPECIAL_GUARD_PX,
      ),
  );

  const lastBlock =
    blocks.length > 0
      ? blocks.reduce((a, b) =>
          a.top + a.height > b.top + b.height ? a : b,
        )
      : null;
  const usedHeight = lastBlock ? lastBlock.top + lastBlock.height : ruledTop;
  const lastVisibleRule =
    visibleRules.length > 0 ? visibleRules[visibleRules.length - 1] : ruledTop;
  const bottomSlackPx = Math.max(
    0,
    ruledBottom - Math.max(usedHeight, lastVisibleRule),
  );

  return { visibleRules, usedHeight, bottomSlackPx };
}
