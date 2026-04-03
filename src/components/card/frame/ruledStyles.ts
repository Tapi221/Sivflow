import type { CSSProperties } from "react";

export type RuledStyleKind = "repeat+bottom" | "repeat-only" | "bottom-only";

export interface RuledParams {
  kind: RuledStyleKind;
  /** 行間(px) */
  rowPx: number;
  /** 位相オフセット(px) */
  phasePx: number;
  /** 罫線の色 (CSS color string) */
  color: string;
  /** 罫線の太さ(px) */
  linePx: number;
  /** bottom-only / repeat+bottom 時の下端線Y(px)。null = フォールバック不使用 */
  bottomLinePx: number | null;
}

// SVG を data URI に変換
function toDataUri(svg: string): string {
  // '#' をエンコードしないと CSS url() がフラグメントと誤解する
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * 繰り返し罫線 SVG を生成する。
 * - rowPx ごとに 1px の水平線を描く。
 * - SVG の viewBox はピクセル等倍なので拡縮しても線幅は保たれる。
 */
function makeRepeatSvg(
  rowPx: number,
  phasePx: number,
  color: string,
  linePx: number,
): string {
  const y = phasePx % rowPx;
  // patternUnits="userSpaceOnUse" + patternTransform で位相をシフト
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="${rowPx}">` +
    `<line x1="0" y1="${y + linePx / 2}" x2="1" y2="${y + linePx / 2}" ` +
    `stroke="${color}" stroke-width="${linePx}"/>` +
    `</svg>`;
  return toDataUri(svg);
}

/**
 * 単一の水平線 SVG (bottom line 用)。
 * width=1, height=linePx で background-size 100% linePxpx と合わせる。
 */
function makeLineSvg(color: string, linePx: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="${linePx}">` +
    `<line x1="0" y1="${linePx / 2}" x2="1" y2="${linePx / 2}" ` +
    `stroke="${color}" stroke-width="${linePx}"/>` +
    `</svg>`;
  return toDataUri(svg);
}

/**
 * ページ背景用の繰り返し罫線 backgroundImage 値を返す。
 * rowPx=24, linePx=1 をデフォルトとして使う。
 */
export function getPageRuledBg(
  color = "rgba(0,0,0,0.03)",
  rowPx = 24,
  linePx = 1,
): { backgroundImage: string; backgroundSize: string } {
  return {
    backgroundImage: makeRepeatSvg(rowPx, 0, color, linePx),
    backgroundSize: `100% ${rowPx}px`,
  };
}

export function getRuledStyle(
  params: RuledParams,
): Pick<
  CSSProperties,
  | "backgroundImage"
  | "backgroundSize"
  | "backgroundPosition"
  | "backgroundRepeat"
> {
  const { kind, rowPx, phasePx, color, linePx, bottomLinePx } = params;

  const repeatUri = makeRepeatSvg(rowPx, phasePx, color, linePx);
  const lineUri = makeLineSvg(color, linePx);

  if (kind === "repeat-only") {
    return {
      backgroundImage: repeatUri,
      backgroundSize: `100% ${rowPx}px`,
      backgroundPosition: `0 ${phasePx}px`,
      backgroundRepeat: "repeat-y",
    };
  }

  if (kind === "bottom-only") {
    const pos =
      bottomLinePx !== null
        ? `0 ${bottomLinePx}px`
        : `0 calc(100% - ${linePx}px)`;
    return {
      backgroundImage: lineUri,
      backgroundSize: `100% ${linePx}px`,
      backgroundPosition: pos,
      backgroundRepeat: "no-repeat",
    };
  }

  // repeat+bottom
  const bottomPos =
    bottomLinePx !== null
      ? `0 ${bottomLinePx}px`
      : `0 calc(100% - ${linePx}px)`;

  return {
    backgroundImage: `${lineUri}, ${repeatUri}`,
    backgroundSize: `100% ${linePx}px, 100% ${rowPx}px`,
    backgroundPosition: `${bottomPos}, 0 ${phasePx}px`,
    backgroundRepeat: "no-repeat, repeat-y",
  };
}
