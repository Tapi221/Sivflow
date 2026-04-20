import {
  detectCssZoomSupport,
  resolveScaleRenderingStrategy,
  type ResolveScaleRenderingStrategyArgs,
  type ScaleRenderingMode,
  type ScaleRenderingStrategy,
} from "@/shared/zoom/scaleRenderingStrategy";

export type CardScaleRenderingMode = ScaleRenderingMode;
export type ResolveCardScaleRenderingStrategyArgs =
  ResolveScaleRenderingStrategyArgs;
export type CardScaleRenderingStrategy = ScaleRenderingStrategy;

export const resolveCardScaleRenderingStrategy = ({
  disableScale,
  effectiveScale,
  supportsCssZoom,
}: ResolveCardScaleRenderingStrategyArgs): CardScaleRenderingStrategy => {
  return resolveScaleRenderingStrategy({
    disableScale,
    effectiveScale,
    supportsCssZoom,
  });
};

export { detectCssZoomSupport };
