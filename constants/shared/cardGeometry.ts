/**
 * カードの物理法則・幾何定数。
 * editor / viewer / popup / grid など全画面で共通参照する。
 */

export const CARD_BASE_WIDTH = 480;
export const CARD_DISPLAY_SCALE = 1.25;
export const CANONICAL_CARD_WIDTH = CARD_BASE_WIDTH;

export const CARD_SAFE_PADDING_PX = 24;
export const CARD_ROW_PX = 24;

const CARD_TOP_PADDING_PX = 10;

export const CARD_CONTENT_TOP_PX = CARD_SAFE_PADDING_PX + CARD_TOP_PADDING_PX;

export const CARD_RULED_OFFSET_TOP_PX = 44;
export const CARD_RULED_OFFSET_BOTTOM_PX = 44;

export const CARD_HEIGHT_PHASE_PX =
  (CARD_RULED_OFFSET_TOP_PX + CARD_RULED_OFFSET_BOTTOM_PX) % CARD_ROW_PX;

export const layoutRowsToCardHeightPx = (rows: number) => {
  return rows * CARD_ROW_PX + CARD_HEIGHT_PHASE_PX;
};

export const cardHeightPxToLayoutRows = (heightPx: number) => {
  return Math.round((heightPx - CARD_HEIGHT_PHASE_PX) / CARD_ROW_PX);
};

export const minCardHeightPxToLayoutRows = (heightPx: number) => {
  return Math.ceil((heightPx - CARD_HEIGHT_PHASE_PX) / CARD_ROW_PX);
};

export const snapMinCardHeightPx = (heightPx: number) => {
  return layoutRowsToCardHeightPx(minCardHeightPxToLayoutRows(heightPx));
};
