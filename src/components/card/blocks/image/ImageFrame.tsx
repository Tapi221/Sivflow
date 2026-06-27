import React from "react";
import { cn } from "@web-renderer/lib/utils";



type ImageTransform = {
  scale: number;
  x: number;
  layout: {
    baseWidthPx: number;
    cropX: number;
  };
};
type ImageFrameProps = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  displayMode?: "fixed" | "fluid";
  zoom?: number;
  scale?: number | null;
  x?: number | null;
  layoutBaseWidthPx?: number | null;
  cropX?: number | null;
  fixedReferenceFrameWidthPx?: number | null;
  fluidAvailableWidthPx?: number | null;
  naturalW?: number | null;
  naturalH?: number | null;
  editable?: boolean;
  onImageClick?: () => void;
  onTransformChange?: (next: ImageTransform) => void;
  onTransformCommit?: (next: ImageTransform) => void;
  onNaturalSize?: (size: { naturalW: number; naturalH: number; }) => void;
  onError?: () => void;
};



const DRAG_START_THRESHOLD_PX = 6;



const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const inferBaseWidthFromLegacyScale = (
  referenceWidthPx: number,
  legacyScale?: number | null,
) => {
  const safeReferenceWidth = Math.max(1, referenceWidthPx ?? 1);
  const safeLegacyScale = clamp(Number(legacyScale ?? 1), 0.2, 1);
  return safeReferenceWidth * safeLegacyScale;
};



const ImageFrame = ({ src, alt, className, imgClassName, displayMode = "fixed", zoom = 1, scale = 1, x = 0, layoutBaseWidthPx, cropX, fixedReferenceFrameWidthPx, fluidAvailableWidthPx, naturalW, naturalH, editable = false, onImageClick, onTransformChange, onTransformCommit, onNaturalSize, onError }: ImageFrameProps) => {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const dragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startNormalizedX: number;
    currentNormalizedX: number;
    started: boolean;
  } | null>(null);
  const suppressClickRef = React.useRef(false);

  const [frameW, setFrameW] = React.useState(0);
  const [frameScaleX, setFrameScaleX] = React.useState(1);
  const frameMetricsRef = React.useRef({ width: 0, scaleX: 1 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragX, setDragX] = React.useState<number | null>(null);
  const [loadedNaturalSize, setLoadedNaturalSize] = React.useState<{
    naturalW: number;
    naturalH: number;
  } | null>(null);

  const safeZoom =
    typeof zoom === "number" && Number.isFinite(zoom) && zoom > 0 ? zoom : 1;

  const safeLegacyScale = clamp(Number(scale ?? 1), 0.2, 1);
  const safeCropX = clamp(Number(cropX ?? x ?? 0), -1, 1);
  const activeX = clamp(Number(dragX ?? safeCropX), -1, 1);

  const safeNaturalW = Number(loadedNaturalSize?.naturalW ?? naturalW ?? 0);
  const safeNaturalH = Number(loadedNaturalSize?.naturalH ?? naturalH ?? 0);
  const ratio =
    safeNaturalW > 0 && safeNaturalH > 0 ? safeNaturalH / safeNaturalW : 1;

  const resolvedReferenceWidthPx =
    typeof fixedReferenceFrameWidthPx === "number" &&
      Number.isFinite(fixedReferenceFrameWidthPx) &&
      fixedReferenceFrameWidthPx > 0
      ? fixedReferenceFrameWidthPx
      : frameW;

  const resolvedBaseWidthPx =
    typeof layoutBaseWidthPx === "number" &&
      Number.isFinite(layoutBaseWidthPx) &&
      layoutBaseWidthPx > 0
      ? layoutBaseWidthPx
      : inferBaseWidthFromLegacyScale(
        resolvedReferenceWidthPx,
        safeLegacyScale,
      );

  const normalizedScale = clamp(
    resolvedBaseWidthPx / Math.max(1, resolvedReferenceWidthPx),
    0.2,
    1,
  );

  const measuredFrameWidthPx = Math.max(
    1,
    (frameW || resolvedReferenceWidthPx || resolvedBaseWidthPx) ?? 1,
  );

  const resolvedAvailableWidthPx =
    typeof fluidAvailableWidthPx === "number" &&
      Number.isFinite(fluidAvailableWidthPx) &&
      fluidAvailableWidthPx > 0
      ? fluidAvailableWidthPx
      : measuredFrameWidthPx;

  const slotWidthPx =
    displayMode === "fluid"
      ? Math.max(1, resolvedAvailableWidthPx)
      : Math.min(
        Math.max(1, resolvedReferenceWidthPx),
        Math.max(1, resolvedAvailableWidthPx),
      );

  const imageWidthPx =
    displayMode === "fluid"
      ? Math.min(
        Math.max(1, resolvedBaseWidthPx * safeZoom),
        Math.max(1, slotWidthPx),
      )
      : Math.min(Math.max(1, resolvedBaseWidthPx), Math.max(1, slotWidthPx));

  const imageHeightPx = Math.max(1, imageWidthPx * ratio);
  const empty = Math.max(0, slotWidthPx - imageWidthPx);
  const leftPx = clamp(((activeX + 1) / 2) * empty, 0, empty);

  const emitTransform = React.useCallback(
    (nextX: number): ImageTransform => ({
      scale: normalizedScale,
      x: nextX,
      layout: {
        baseWidthPx: Math.max(1, resolvedBaseWidthPx),
        cropX: nextX,
      },
    }),
    [normalizedScale, resolvedBaseWidthPx],
  );

  const transformCallback = onTransformCommit ?? onTransformChange ?? undefined;

  const dragEnabled =
    editable && empty > 0 && typeof transformCallback === "function";

  React.useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const update = () => {
      const rectW = node.getBoundingClientRect().width;
      const layoutW = node.offsetWidth || rectW;
      const nextScaleX = node.offsetWidth > 0 ? rectW / node.offsetWidth : 1;
      const safeNextScaleX =
        Number.isFinite(nextScaleX) && nextScaleX > 0 ? nextScaleX : 1;

      const prev = frameMetricsRef.current;
      if (
        Math.abs(prev.width - layoutW) < 0.5 &&
        Math.abs(prev.scaleX - safeNextScaleX) < 0.001
      ) {
        return;
      }

      frameMetricsRef.current = { width: layoutW, scaleX: safeNextScaleX };
      setFrameW(layoutW);
      setFrameScaleX(safeNextScaleX);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    setLoadedNaturalSize(null);
  }, [src]);

  React.useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      return;
    }

    setLoadedNaturalSize((prev) => {
      if (
        prev?.naturalW === img.naturalWidth &&
        prev?.naturalH === img.naturalHeight
      ) {
        return prev;
      }

      return { naturalW: img.naturalWidth, naturalH: img.naturalHeight };
    });
  }, [src]);

  return (
    <div
      ref={frameRef}
      className={cn("relative w-full", className)}
      style={{
        height: `${imageHeightPx}px`,
      }}
    >
      <div
        className="relative mx-auto overflow-hidden"
        style={{
          width: `${slotWidthPx}px`,
          height: `${imageHeightPx}px`,
          touchAction: dragEnabled ? "none" : "auto",
          cursor: dragEnabled ? (isDragging ? "grabbing" : "grab") : undefined,
        }}
        onPointerDown={(event) => {
          if (!dragEnabled) return;
          event.stopPropagation();
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startNormalizedX: activeX,
            currentNormalizedX: activeX,
            started: false,
          };
        }}
        onPointerMove={(event) => {
          if (!dragEnabled || !dragRef.current) return;
          if (event.pointerId !== dragRef.current.pointerId) return;

          const deltaX = event.clientX - dragRef.current.startX;
          if (!dragRef.current.started) {
            if (Math.abs(deltaX) <= DRAG_START_THRESHOLD_PX) return;
            dragRef.current.started = true;
            setIsDragging(true);
            suppressClickRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }

          event.preventDefault();
          event.stopPropagation();

          const visualEmpty = Math.max(1, empty * frameScaleX);
          const nextX = clamp(
            dragRef.current.startNormalizedX + (deltaX / visualEmpty) * 2,
            -1,
            1,
          );

          dragRef.current.currentNormalizedX = nextX;
          setDragX(nextX);
          onTransformChange?.(emitTransform(nextX));
        }}
        onPointerUp={(event) => {
          if (
            !dragRef.current ||
            event.pointerId !== dragRef.current.pointerId
          ) {
            return;
          }

          const started = dragRef.current.started;
          const finalX = dragRef.current.currentNormalizedX;

          if (
            started &&
            event.currentTarget.hasPointerCapture(event.pointerId)
          ) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }

          dragRef.current = null;
          setIsDragging(false);
          setDragX(null);

          if (started) {
            transformCallback?.(emitTransform(finalX));
            window.setTimeout(() => {
              suppressClickRef.current = false;
            }, 0);
          }
        }}
        onPointerCancel={(event) => {
          if (
            !dragRef.current ||
            event.pointerId !== dragRef.current.pointerId
          ) {
            return;
          }

          const started = dragRef.current.started;

          if (
            started &&
            event.currentTarget.hasPointerCapture(event.pointerId)
          ) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }

          dragRef.current = null;
          setIsDragging(false);
          setDragX(null);

          if (started) {
            window.setTimeout(() => {
              suppressClickRef.current = false;
            }, 0);
          }
        }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={cn(
            editable
              ? "absolute top-0 h-auto max-w-none"
              : "absolute top-0 h-auto max-w-none",
            imgClassName,
          )}
          style={{
            width: `${imageWidthPx}px`,
            left: `${leftPx}px`,
            maxWidth: "none",
          }}
          decoding="async"
          draggable={false}
          onClick={() => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            onImageClick?.();
          }}
          onLoad={(event) => {
            const target = event.currentTarget;
            setLoadedNaturalSize((prev) => {
              if (
                prev?.naturalW === target.naturalWidth &&
                prev?.naturalH === target.naturalHeight
              ) {
                return prev;
              }

              return {
                naturalW: target.naturalWidth,
                naturalH: target.naturalHeight,
              };
            });
            onNaturalSize?.({
              naturalW: target.naturalWidth,
              naturalH: target.naturalHeight,
            });
          }}
          onError={() => onError?.()}
        />
      </div>
    </div>
  );
};



export { ImageFrame };
