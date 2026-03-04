// src/Components/card/constants.ts みたいな「カードの物理法則」置き場に置く想定。
// ここにある値を editor / viewer / popup / grid など全画面で共通参照する。
// 画面ごとに勝手な padding/width/rowHeight を持つと、ズレ・縦スクロール・影の見切れが再発する。

/**
 * カードの基準幅(px)。
 * - レイアウト計算・ScaleToFit・最大幅の基準になる
 * - 画面ごとに別の幅を採用すると「同じカードなのに見た目が違う」地獄が発生する
 */
export const CARD_BASE_WIDTH = 480;

/**
 * 正規(=canonical)カード幅(px)。
 * - 現状は BASE と同一
 * - 将来 BASE と CANONICAL を分けても参照先を固定できるようにするための別名
 *   (参照側はこっちを見るのが安全)
 */
export const CANONICAL_CARD_WIDTH = CARD_BASE_WIDTH;

/**
 * カード内の安全余白(px)。
 * - 角丸/影/端のUI(ボタンやスクロールバー)とコンテンツが干渉しないための最低余白
 * - CardSurface/BlockEditor の padding/inset は基本この値を基準に合わせる
 */
export const CARD_SAFE_PADDING_PX = 24;

/**
 * 1行(罫線ピッチ/行高)の基準(px)。
 * - 罫線背景の行間
 * - テキストの line-height
 * - 高さ計算( rows -> px ) のステップ
 * ここがズレると「紙っぽさ」が死ぬし、謎の縦ズレやスクロールが出る。
 */
export const CARD_ROW_PX = 24;

/**
 * カード上部の安全領域(px)。
 * - 左上/右上のカード角アクション(例: ☆ / ? / メニュー)のために確保する上余白
 * - editor/view で一致させないと、片方だけボタンが被る・押せない・余白感が違う事故になる
 */
export const CARD_TOP_PADDING_PX = 10;

/**
 * カード本文の開始Y(px)。
 * - 本文コンテンツ（BlockEditor/BlockRenderer）の開始位置用
 * - 罫線開始位置は CARD_RULED_OFFSET_TOP_PX を参照する
 */
export const CARD_CONTENT_TOP_PX = CARD_SAFE_PADDING_PX + CARD_TOP_PADDING_PX;

/**
 * カード上端から最初の罫線までの距離(px)。
 * 全画面共通で固定値として扱う。
 */
export const CARD_RULED_OFFSET_TOP_PX = 44;

/**
 * カード下端から最後の罫線までの距離(px)。
 * 全画面共通で固定値として扱う。
 */
export const CARD_RULED_OFFSET_BOTTOM_PX = 44;

/**
 * カード高さの位相補正(px)。
 * 高さを 24px グリッドで扱いつつ、上下の罫線オフセット(44px + 44px)を
 * 同時に満たすための固定補正値。
 */
export const CARD_HEIGHT_PHASE_PX =
  (CARD_RULED_OFFSET_TOP_PX + CARD_RULED_OFFSET_BOTTOM_PX) % CARD_ROW_PX;

/**
 * layoutRows を実際のカード高さ(px)へ変換。
 */
export function layoutRowsToCardHeightPx(rows: number): number {
  return rows * CARD_ROW_PX + CARD_HEIGHT_PHASE_PX;
}

/**
 * カード高さ(px)を layoutRows へ逆変換。
 */
export function cardHeightPxToLayoutRows(heightPx: number): number {
  return Math.round((heightPx - CARD_HEIGHT_PHASE_PX) / CARD_ROW_PX);
}

/**
 * 「この高さ以上が必要」という最小必要高さ(px)を rows へ変換。
 * 編集画面の min-height 判定では round ではなく ceil を使う。
 */
export function minCardHeightPxToLayoutRows(heightPx: number): number {
  return Math.ceil((heightPx - CARD_HEIGHT_PHASE_PX) / CARD_ROW_PX);
}

export function snapMinCardHeightPx(heightPx: number): number {
  return layoutRowsToCardHeightPx(minCardHeightPxToLayoutRows(heightPx));
}
