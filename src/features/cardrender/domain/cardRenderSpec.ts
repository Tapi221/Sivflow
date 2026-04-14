import type { CardDisplayMode } from "@/types/domain/cardSet";

export type CardSurfaceMode = "card" | "fluid";
export type CardInteractionMode = "view" | "edit";
export type CardChromeScaleMode = "fixed";

export interface CardRenderSpec {
  surfaceMode: CardSurfaceMode;
  interactionMode: CardInteractionMode;
  zoomScale: number;
  chromeScaleMode: CardChromeScaleMode;
  showInk: boolean;
}

const MIN_ZOOM_SCALE = 0.5;
const MAX_ZOOM_SCALE = 4;

export const clampCardRenderZoomScale = (value: number) => {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, value));
};

export const resolveCardSurfaceMode = (
  displayMode?: CardDisplayMode,
): CardSurfaceMode => {
  return displayMode === "fluid" ? "fluid" : "card";
};

export const buildCardRenderSpec = ({
  displayMode,
  interactionMode,
  zoomScale,
  showInk,
}: {
  displayMode?: CardDisplayMode;
  interactionMode: CardInteractionMode;
  zoomScale?: number;
  showInk?: boolean;
}): CardRenderSpec => {
  const surfaceMode = resolveCardSurfaceMode(displayMode);
  const normalizedZoomScale = clampCardRenderZoomScale(zoomScale ?? 1);

  return {
    surfaceMode,
    interactionMode,
    zoomScale: normalizedZoomScale,
    chromeScaleMode: "fixed",
    showInk: Boolean(showInk && surfaceMode === "card"),
  };
};

export const resolveCardSurfaceScale = (spec: CardRenderSpec) => {
  return spec.surfaceMode === "card" ? spec.zoomScale : 1;
};

export const resolveCardContentZoom = (spec: CardRenderSpec) => {
  return spec.surfaceMode === "fluid" ? spec.zoomScale : 1;
};

export const resolveCardUsesSurfaceScale = (spec: CardRenderSpec) => {
  return spec.surfaceMode === "card";
};

export const resolveCardUsesStretchWidth = (spec: CardRenderSpec) => {
  return spec.surfaceMode === "fluid";
};

export const resolveCardDisablesFrameScale = (spec: CardRenderSpec) => {
  return spec.surfaceMode === "fluid";
};
