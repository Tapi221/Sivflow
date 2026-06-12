const CARD_BASE_WIDTH = 480;
const CARD_DISPLAY_SCALE = 1.25;
const CANONICAL_CARD_WIDTH = CARD_BASE_WIDTH;
const CARD_SAFE_PADDING_PX = 24;
const CARD_ROW_PX = 24;
const CARD_TOP_PADDING_PX = 10;
const CARD_CONTENT_TOP_PX = CARD_SAFE_PADDING_PX + CARD_TOP_PADDING_PX;
const CARD_RULED_OFFSET_TOP_PX = 30;
const CARD_RULED_OFFSET_BOTTOM_PX = 20;
const CARD_HEIGHT_PHASE_PX = (CARD_RULED_OFFSET_TOP_PX + CARD_RULED_OFFSET_BOTTOM_PX) % CARD_ROW_PX;



const layoutRowsToCardHeightPx = (rows: number) => rows * CARD_ROW_PX + CARD_HEIGHT_PHASE_PX;
const cardHeightPxToLayoutRows = (heightPx: number) => Math.round((heightPx - CARD_HEIGHT_PHASE_PX) / CARD_ROW_PX);
const minCardHeightPxToLayoutRows = (heightPx: number) => Math.ceil((heightPx - CARD_HEIGHT_PHASE_PX) / CARD_ROW_PX);
const snapMinCardHeightPx = (heightPx: number) => layoutRowsToCardHeightPx(minCardHeightPxToLayoutRows(heightPx));



export { CARD_BASE_WIDTH, CARD_CONTENT_TOP_PX, CARD_DISPLAY_SCALE, CARD_HEIGHT_PHASE_PX, CARD_ROW_PX, CARD_RULED_OFFSET_BOTTOM_PX, CARD_RULED_OFFSET_TOP_PX, CARD_SAFE_PADDING_PX, CANONICAL_CARD_WIDTH, cardHeightPxToLayoutRows, layoutRowsToCardHeightPx, minCardHeightPxToLayoutRows, snapMinCardHeightPx };
