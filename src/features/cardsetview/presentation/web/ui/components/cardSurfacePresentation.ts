import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import {
  buildCardRenderSpec,
  resolveCardContentZoom,
  resolveCardSurfaceScale,
  type CardInteractionMode,
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

export type BuildCardSurfaceMetricsArgs = Readonly<{
  displayMode: CardDisplayMode;
  cardLayoutMode: CardLayoutMode;
  interactionMode?: CardInteractionMode;
  zoomScale: number;
  fitScale?: number;
  showInk?: boolean;
}>;

const resolveSafeFitScale = (value?: number) => {
  if (typeof value !== "number") return 1;
  if (!Number.isFinite(value)) return 1;
  if (value <= 0) return 1;
  return value;
};

export const buildCardSurfaceMetrics = ({
  displayMode,
  cardLayoutMode,
  interactionMode = "view",
  zoomScale,
  fitScale = 1,
  showInk = interactionMode === "view" && displayMode === "fixed",
}: BuildCardSurfaceMetricsArgs): SharedCardSurfaceMetrics => {
  const safeFitScale = resolveSafeFitScale(fitScale);
  const renderSpec = buildCardRenderSpec({
    displayMode,
    interactionMode,
    zoomScale,
    showInk,
  });

  const isSplitLayout = cardLayoutMode === "split";
  const isFlipLayout = cardLayoutMode === "flip";

  const baseFixedScale =
    displayMode === "fixed"
      ? resolveCardSurfaceScale(renderSpec) * safeFitScale
      : undefined;
  const baseContentZoom = resolveCardContentZoom(renderSpec);
  const baseHeaderIconVisualScale =
    typeof baseFixedScale === "number" && Number.isFinite(baseFixedScale)
      ? Math.max(0.1, baseFixedScale)
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
      : typeof sideFixedScale === "number"
        ? Math.max(0.1, sideFixedScale)
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

export const buildSharedCardSurfaceMetrics = ({
  displayMode,
  cardLayoutMode,
  zoomScale,
}: {
  displayMode: CardDisplayMode;
  cardLayoutMode: CardLayoutMode;
  zoomScale: number;
}) => buildCardSurfaceMetrics({ displayMode, cardLayoutMode, zoomScale });
