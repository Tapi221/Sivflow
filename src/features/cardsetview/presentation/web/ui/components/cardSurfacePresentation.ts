import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import {
  buildCardRenderSpec,
  resolveCardContentZoom,
  resolveCardSurfaceScale,
  type CardRenderSpec,
} from "@/features/cardrender/domain/cardRenderSpec";
import type { CardDisplayMode } from "@/types/domain/cardSet";

export type SharedCardSurfaceMetrics = {
  renderSpec: CardRenderSpec;
  isSplitLayout: boolean;
  isFlipLayout: boolean;
  baseFixedScale?: number;
  baseContentZoom: number;
  baseHeaderIconVisualScale: number;
  sideFixedScale?: number;
  sideContentZoom: number;
  sideHeaderIconVisualScale: number;
};

export const buildSharedCardSurfaceMetrics = ({
  displayMode,
  cardLayoutMode,
  zoomScale,
}: {
  displayMode: CardDisplayMode;
  cardLayoutMode: CardLayoutMode;
  zoomScale: number;
}): SharedCardSurfaceMetrics => {
  const renderSpec = buildCardRenderSpec({
    displayMode,
    interactionMode: "view",
    zoomScale,
    showInk: displayMode === "fixed",
  });

  const isSplitLayout = cardLayoutMode === "split";
  const isFlipLayout = cardLayoutMode === "flip";

  const baseFixedScale =
    displayMode === "fixed" ? resolveCardSurfaceScale(renderSpec) : undefined;
  const baseContentZoom = resolveCardContentZoom(renderSpec);
  const baseHeaderIconVisualScale =
    renderSpec.surfaceMode === "card" &&
    Number.isFinite(renderSpec.zoomScale) &&
    renderSpec.zoomScale > 0
      ? renderSpec.zoomScale
      : 1;

  const sideFixedScale =
    typeof baseFixedScale === "number"
      ? isSplitLayout
        ? Math.max(0.1, baseFixedScale / 2)
        : baseFixedScale
      : undefined;

  const sideContentZoom =
    displayMode === "fluid" && isSplitLayout
      ? Math.max(0.1, baseContentZoom / 2)
      : baseContentZoom;

  const sideHeaderIconVisualScale =
    displayMode === "fluid"
      ? 1
      : isSplitLayout
        ? Math.max(0.1, baseHeaderIconVisualScale / 2)
        : baseHeaderIconVisualScale;

  return {
    renderSpec,
    isSplitLayout,
    isFlipLayout,
    baseFixedScale,
    baseContentZoom,
    baseHeaderIconVisualScale,
    sideFixedScale,
    sideContentZoom,
    sideHeaderIconVisualScale,
  };
};
