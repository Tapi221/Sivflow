import type { ResolveScaleRenderingStrategyArgs, ScaleRenderingMode, ScaleRenderingStrategy } from "@/utils/zoom/scaleRenderingStrategy";
import { detectCssZoomSupport, resolveScaleRenderingStrategy } from "@/utils/zoom/scaleRenderingStrategy";



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
