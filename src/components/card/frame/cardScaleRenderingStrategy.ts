import type { ResolveScaleRenderingStrategyArgs, ScaleRenderingMode, ScaleRenderingStrategy } from "@/shared/zoom/scaleRenderingStrategy";
import { detectCssZoomSupport, resolveScaleRenderingStrategy } from "@/shared/zoom/scaleRenderingStrategy";



type CardScaleRenderingMode = ScaleRenderingMode;
type ResolveCardScaleRenderingStrategyArgs = ResolveScaleRenderingStrategyArgs;
type CardScaleRenderingStrategy = ScaleRenderingStrategy;



const resolveCardScaleRenderingStrategy = ({
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



export { detectCssZoomSupport, resolveCardScaleRenderingStrategy };



export type { CardScaleRenderingMode, CardScaleRenderingStrategy, ResolveCardScaleRenderingStrategyArgs };
