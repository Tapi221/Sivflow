import type { CSSProperties } from "react";

const MIN_CARD_SET_VIEW_ZOOM = 0.5;
const MAX_CARD_SET_VIEW_ZOOM = 4;

const clampNumber = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const toPx = (value: number) => {
  return `${Number(value.toFixed(3))}px`;
};

export const normalizeCardSetViewZoom = (zoom?: number) => {
  const safeZoom = typeof zoom === "number" && Number.isFinite(zoom) ? zoom : 1;

  return clampNumber(safeZoom, MIN_CARD_SET_VIEW_ZOOM, MAX_CARD_SET_VIEW_ZOOM);
};

export const scaleTypographyValuePx = (basePx: number, zoom?: number) => {
  return toPx(basePx * normalizeCardSetViewZoom(zoom));
};

export const scaleTypographyNumberPx = (basePx: number, zoom?: number) => {
  return Math.max(
    8,
    Number((basePx * normalizeCardSetViewZoom(zoom)).toFixed(3)),
  );
};

export const buildTypographyStyle = ({
  fontSizePx,
  lineHeightPx,
  zoom,
}: {
  fontSizePx: number;
  lineHeightPx: number;
  zoom?: number;
}): CSSProperties => {
  return {
    fontSize: scaleTypographyValuePx(fontSizePx, zoom),
    lineHeight: scaleTypographyValuePx(lineHeightPx, zoom),
  };
};

export const mergeStyles = (
  ...styles: Array<CSSProperties | undefined>
): CSSProperties => {
  return styles.reduce<CSSProperties>((acc, style) => {
    if (!style) return acc;
    return { ...acc, ...style };
  }, {});
};
