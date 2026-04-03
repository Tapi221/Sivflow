import React from "react";
import { cn } from "@/lib/utils";

export interface ScaleToFitFrameProps {
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
}

export function ScaleToFitFrame({
  children,
  className,
  baseWidth = 480,
  scaleMultiplier = 1,
  fixedScale,
  disableScale = false,
  fitHeight = false,
  centerContent = false,
  allowUpscale = false,
  maxScale = 1.6,
  contentPaddingPx = 0,
}: ScaleToFitFrameProps) {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const [scale, setScale] = React.useState(1);
  const [contentHeight, setContentHeight] = React.useState<number | null>(null);

  const hasFixedScale =
    typeof fixedScale === "number" &&
    Number.isFinite(fixedScale) &&
    fixedScale > 0;

  const effectiveScale = disableScale
    ? 1
    : hasFixedScale
      ? Math.max(0.1, fixedScale)
      : scale;

  React.useLayoutEffect(() => {
    if (disableScale) {
      setScale(1);
      return;
    }
    if (hasFixedScale) return;
    if (typeof ResizeObserver === "undefined") return;
    if (!frameRef.current) return;

    const frame = frameRef.current;
    const observeTarget = frame.parentElement ?? frame;

    const calcScale = () => {
      const measuredWidth = frame.getBoundingClientRect().width;
      const availableWidth =
        Number.isFinite(measuredWidth) && measuredWidth > 0
          ? measuredWidth
          : frame.clientWidth;

      if (!availableWidth) return;

      const safeBase = Math.max(1, baseWidth);
      const fitByWidth = availableWidth / safeBase;
      const fitByHeight =
        fitHeight && contentHeight && frame.clientHeight
          ? frame.clientHeight / Math.max(1, contentHeight)
          : Number.POSITIVE_INFINITY;

      const fitScale = Math.min(fitByWidth, fitByHeight);
      const upperBound = allowUpscale ? Math.max(1, maxScale) : 1;
      const nextScale = Math.max(
        0.1,
        Math.min(upperBound, fitScale * scaleMultiplier),
      );

      setScale((prev) =>
        Math.abs(prev - nextScale) < 0.0001 ? prev : nextScale,
      );
    };

    calcScale();

    const observer = new ResizeObserver(calcScale);
    observer.observe(observeTarget);

    return () => observer.disconnect();
  }, [
    baseWidth,
    scaleMultiplier,
    hasFixedScale,
    disableScale,
    fitHeight,
    contentHeight,
    allowUpscale,
    maxScale,
  ]);

  React.useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    if (!contentRef.current) return;

    const content = contentRef.current;

    const updateHeight = () => {
      const h = content.offsetHeight;
      const next = Math.max(0, Math.ceil(h));
      setContentHeight((prev) => (prev === next ? prev : next));
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);

    return () => observer.disconnect();
  }, []);

  const scaledHeight =
    contentHeight != null
      ? Math.ceil(contentHeight * effectiveScale)
      : null;

  const safePaddingPx = Math.max(0, contentPaddingPx);
  const safeBaseWidth = Math.max(1, baseWidth);
  const shouldUseZoomScale =
    !disableScale && Math.abs(effectiveScale - 1) > 0.0001;
  const shouldUseTransformScale = hasFixedScale && shouldUseZoomScale;
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
        !fitHeight && scaledHeight != null
          ? { height: `${scaledHeight}px` }
          : undefined
      }
    >
      <div
        className={cn(
          fitHeight && centerContent
            ? "h-full flex items-center justify-center"
            : "flex justify-center",
        )}
      >
        <div
          style={
            disableScale
              ? {
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                }
              : visualWidthPx != null
                ? { width: `${visualWidthPx.toFixed(3)}px` }
                : undefined
          }
        >
          <div
            style={{
              width: disableScale ? "100%" : `${safeBaseWidth}px`,
              maxWidth: disableScale ? "100%" : undefined,
              minWidth: disableScale ? 0 : undefined,
              transform: shouldUseTransformScale
                ? `scale(${effectiveScale})`
                : "none",
              transformOrigin: disableScale
                ? "initial"
                : fitHeight && centerContent
                  ? "center center"
                  : "top left",
              willChange: shouldUseTransformScale ? "transform" : undefined,
              zoom:
                shouldUseZoomScale && !shouldUseTransformScale
                  ? effectiveScale
                  : undefined,
            }}
          >
            <div
              ref={contentRef}
              className="flow-root"
              style={{ padding: safePaddingPx }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

