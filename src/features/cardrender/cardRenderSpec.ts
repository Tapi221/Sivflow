import type { CardDisplayMode } from "@/types/domain/cardSet";



type CardSurfaceMode = "card" | "fluid";
type CardInteractionMode = "view" | "edit";
type CardChromeScaleMode = "fixed";
interface CardRenderSpec {
  surfaceMode: CardSurfaceMode;
  interactionMode: CardInteractionMode;
  zoomScale: number;
  chromeScaleMode: CardChromeScaleMode;
  showInk: boolean;
}



const MIN_ZOOM_SCALE = 0.5;
const MAX_ZOOM_SCALE = 4;



const clampCardRenderZoomScale = (value: number) => {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, value));
};
const resolveCardSurfaceMode = (displayMode?: CardDisplayMode): CardSurfaceMode => {
  return displayMode === "fluid" ? "fluid" : "card";
};
const buildCardRenderSpec = ({ displayMode, interactionMode, zoomScale, showInk }: { displayMode?: CardDisplayMode;
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
const resolveCardSurfaceScale = (spec: CardRenderSpec) => {
  return spec.surfaceMode === "card" ? spec.zoomScale : 1;
};
const resolveCardContentZoom = (spec: CardRenderSpec) => {
  return spec.surfaceMode === "fluid" ? spec.zoomScale : 1;
};
const resolveCardUsesSurfaceScale = (spec: CardRenderSpec) => {
  return spec.surfaceMode === "card";
};
const resolveCardUsesStretchWidth = (spec: CardRenderSpec) => {
  return spec.surfaceMode === "fluid";
};
const resolveCardDisablesFrameScale = (spec: CardRenderSpec) => {
  return spec.surfaceMode === "fluid";
};



export { clampCardRenderZoomScale, resolveCardSurfaceMode, buildCardRenderSpec, resolveCardSurfaceScale, resolveCardContentZoom, resolveCardUsesSurfaceScale, resolveCardUsesStretchWidth, resolveCardDisablesFrameScale };


export type { CardSurfaceMode, CardInteractionMode, CardChromeScaleMode, CardRenderSpec };
