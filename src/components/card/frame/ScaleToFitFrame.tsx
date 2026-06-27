import React from "react";
import { cn } from "@web-renderer/lib/utils";
import { detectCssZoomSupport, resolveCardScaleRenderingStrategy } from "./cardScaleRenderingStrategy";
import { observeElementRect } from "./elementRectObserver";



interface ScaleToFitFrameProps {
  children: React.ReactNode;
  className?: string;
  baseWidth?: number;
  scaleMultiplier?: number;
  fixedScale?: number;
  disableScale?: boolean;
  fitHeight?: boolean;
  centerContent?: boolean;
  allowUpscale?: boolean;
  maxScale?: number;
  contentPaddingPx?: number;
  intrinsicHeightPx?: number | null;
}



const CONTENT_HEIGHT_EPSILON_PX = 2;



const resolveLogicalHeight = ({
  contentElement,
  measurementScale,
}: {
  readonly contentElement: HTMLDivElement;
  readonly measurementScale: number;
}) => {
  const visualHeight = contentElement.getBoundingClientRect().height;
  const safeMeasurementScale =
    Number.isFinite(measurementScale) && measurementScale > 0
      ? measurementScale
      : 1;

  return Math.max(0, visualHeight / safeMeasurementScale);
};



const ScaleToFitFrame = ({ children, className, baseWidth = 480, scaleMultiplier = 1, fixedScale, disableScale = false, fitHeight = false, centerContent = false, allowUpscale = false, maxScale = 1.6, contentPaddingPx = 0, intrinsicHeightPx = null }: ScaleToFitFrameProps) => {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const [scale, setScale] = React.useState(1);
  const [contentHeight, setContentHeight] = React.useState<number | null>(null);

  const supportsCssZoom = React.useMemo(() => detectCssZoomSupport(), []);

  const hasFixedScale =
    typeof fixedScale === "number" &&
    Number.isFinite(fixedScale) &&
    fixedScale > 0;

  const effectiveScale = disableScale
    ? 1
    : hasFixedScale
      ? Math.max(0.1, fixedScale)
      : scale;

  const renderingStrategy = React.useMemo(
    () =>
      resolveCardScaleRenderingStrategy({
        disableScale,
        effectiveScale,
        supportsCssZoom,
      }),
    [disableScale, effectiveScale, supportsCssZoom],
  );

  const measurementScale = renderingStrategy.shouldApplyScale
    ? effectiveScale
    : 1;

  const resolvedIntrinsicHeightPx =
    typeof intrinsicHeightPx === "number" &&
      Number.isFinite(intrinsicHeightPx) &&
      intrinsicHeightPx > 0
      ? intrinsicHeightPx
      : null;

  const resolvedContentHeight = resolvedIntrinsicHeightPx ?? contentHeight;

  React.useLayoutEffect(() => {
    if (disableScale) {
      setScale(1);
      return;
    }

    if (hasFixedScale) {
      return;
    }

    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    const observeTarget = frame.parentElement ?? frame;

    const calcScale = () => {
      const measuredWidth = frame.getBoundingClientRect().width;
      const availableWidth =
        Number.isFinite(measuredWidth) && measuredWidth > 0
          ? measuredWidth
          : frame.clientWidth;

      if (!availableWidth) {
        return;
      }

      const safeBase = Math.max(1, baseWidth);
      const fitByWidth = availableWidth / safeBase;
      const fitByHeight =
        fitHeight && resolvedContentHeight && frame.clientHeight
          ? frame.clientHeight / Math.max(1, resolvedContentHeight)
          : Number.POSITIVE_INFINITY;

      const fitScale = Math.min(fitByWidth, fitByHeight);
      const upperBound = allowUpscale ? Math.max(1, maxScale) : 1;
      const nextScale = Math.max(
        0.1,
        Math.min(upperBound, fitScale * scaleMultiplier),
      );

      setScale((previousScale) =>
        Math.abs(previousScale - nextScale) < 0.0001
          ? previousScale
          : nextScale,
      );
    };

    calcScale();

    return observeElementRect(observeTarget, calcScale);
  }, [
    allowUpscale,
    baseWidth,
    resolvedContentHeight,
    disableScale,
    fitHeight,
    hasFixedScale,
    maxScale,
    scaleMultiplier,
  ]);

  React.useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }

    if ((resolvedIntrinsicHeightPx !== null && resolvedIntrinsicHeightPx !== undefined)) {
      return;
    }

    const updateHeight = () => {
      const logicalHeight = resolveLogicalHeight({
        contentElement: content,
        measurementScale,
      });
      const nextHeight = Math.max(0, Math.ceil(logicalHeight));
      setContentHeight((previousHeight) =>
        (previousHeight !== null && previousHeight !== undefined) &&
          Math.abs(previousHeight - nextHeight) < CONTENT_HEIGHT_EPSILON_PX
          ? previousHeight
          : nextHeight,
      );
    };

    updateHeight();

    return observeElementRect(content, updateHeight);
  }, [measurementScale, resolvedIntrinsicHeightPx]);

  const scaledHeight =
    (resolvedContentHeight !== null && resolvedContentHeight !== undefined)
      ? Math.ceil(resolvedContentHeight * effectiveScale)
      : null;

  const safePaddingPx = Math.max(0, contentPaddingPx);
  const safeBaseWidth = Math.max(1, baseWidth);
  const visualWidthPx = disableScale ? null : safeBaseWidth * effectiveScale;

  return (
    <div
      ref={frameRef}
      className={cn(
        "w-full min-h-0 overflow-visible",
        fitHeight && "h-full",
        className,
      )}
      style={
        !fitHeight && (scaledHeight !== null && scaledHeight !== undefined)
          ? { height: `${scaledHeight}px` }
          : undefined
      }
    >
      <div
        className={cn(
          fitHeight && centerContent
            ? "h-full flex items-center justify-center"
            : "flex justify-center",
          fitHeight && !centerContent && "h-full",
        )}
      >
        <div
          className={cn(fitHeight && "h-full")}
          style={
            disableScale
              ? {
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                height: fitHeight ? "100%" : undefined,
              }
              : (visualWidthPx !== null && visualWidthPx !== undefined)
                ? {
                  width: `${visualWidthPx.toFixed(3)}px`,
                  height: fitHeight ? "100%" : undefined,
                }
                : fitHeight
                  ? {
                    height: "100%",
                  }
                  : undefined
          }
        >
          <div
            className={cn(fitHeight && "h-full")}
            style={{
              width: disableScale ? "100%" : `${safeBaseWidth}px`,
              maxWidth: disableScale ? "100%" : undefined,
              minWidth: disableScale ? 0 : undefined,
              height: fitHeight ? "100%" : undefined,
              transform: renderingStrategy.transform,
              transformOrigin: disableScale
                ? "initial"
                : fitHeight && centerContent
                  ? "center center"
                  : "top left",
              willChange: renderingStrategy.willChange,
              zoom: renderingStrategy.zoom,
            }}
          >
            <div
              ref={contentRef}
              className={cn("flow-root", fitHeight && "h-full")}
              style={{ padding: safePaddingPx }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



export { ScaleToFitFrame };


export type { ScaleToFitFrameProps };
