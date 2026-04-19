export type CardScaleRenderingMode = "none" | "zoom" | "transform";

export interface ResolveCardScaleRenderingStrategyArgs {
  readonly disableScale: boolean;
  readonly effectiveScale: number;
  readonly supportsCssZoom: boolean;
}

export interface CardScaleRenderingStrategy {
  readonly mode: CardScaleRenderingMode;
  readonly shouldApplyScale: boolean;
  readonly zoom: number | undefined;
  readonly transform: string;
  readonly willChange: "transform" | undefined;
}

const SCALE_EPSILON = 0.0001;

const normalizeScale = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return value;
};

export const detectCssZoomSupport = () => {
  if (typeof CSS === "undefined") {
    return false;
  }

  if (typeof CSS.supports !== "function") {
    return false;
  }

  try {
    return CSS.supports("zoom", "1.1");
  } catch {
    return false;
  }
};

export const resolveCardScaleRenderingStrategy = ({
  disableScale,
  effectiveScale,
  supportsCssZoom,
}: ResolveCardScaleRenderingStrategyArgs): CardScaleRenderingStrategy => {
  const safeScale = normalizeScale(effectiveScale);
  const shouldApplyScale =
    !disableScale && Math.abs(safeScale - 1) > SCALE_EPSILON;

  if (!shouldApplyScale) {
    return {
      mode: "none",
      shouldApplyScale: false,
      zoom: undefined,
      transform: "none",
      willChange: undefined,
    };
  }

  if (supportsCssZoom) {
    return {
      mode: "zoom",
      shouldApplyScale: true,
      zoom: safeScale,
      transform: "none",
      willChange: undefined,
    };
  }

  return {
    mode: "transform",
    shouldApplyScale: true,
    zoom: undefined,
    transform: `scale(${safeScale})`,
    willChange: "transform",
  };
};
