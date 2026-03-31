import type { CardBlock } from "@/types";

/** text / markdown は背景横罫線を持つ。それ以外は持たない。 */
export const hasRuledLine = (type: CardBlock["type"]): boolean =>
  type === "text" || type === "markdown";

/**
 * prev と next が両方とも非罫線ブロックのとき true。
 * BlockRenderer / BlockEditor の両方からこれを使い、判定ロジックの乖離を防ぐ。
 */
export const shouldRenderInterBlockSeparator = (
  prevType: CardBlock["type"],
  nextType: CardBlock["type"],
): boolean => !hasRuledLine(prevType) && !hasRuledLine(nextType);
