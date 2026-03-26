import React from "react";
import { cn } from "@/lib/utils";

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const DRAG_START_THRESHOLD_PX = 6;

type ImageFrameProps = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  scale?: number | null;
  x?: number | null;
  naturalW?: number | null;
  naturalH?: number | null;
  editable?: boolean;
  onImageClick?: () => void;
  onTransformChange?: (next: { scale: number; x: number }) => void;
  onNaturalSize?: (size: { naturalW: number; naturalH: number }) => void;
  onError?: () => void;
};

export function ImageFrame({
  src,
  alt,
  className,
  imgClassName,
  scale = 1,
  x = 0,
  naturalW,
  naturalH,
  editable = false,
  onImageClick,
  onTransformChange,
  onNaturalSize,
  onError,
}: ImageFrameProps) {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const dragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startNormalizedX: number;
    started: boolean;
  } | null>(null);
  const suppressClickRef = React.useRef(false);
  const [frameW, setFrameW] = React.useState(0);
  const [frameScaleX, setFrameScaleX] = React.useState(1);
  const [isDragging, setIsDragging] = React.useState(false);
  const [loadedNaturalSize, setLoadedNaturalSize] = React.useState<{
    naturalW: number;
    naturalH: number;
  } | null>(null);

  const safeScale = clamp(Number(scale ?? 1), 0.2, 1);
  const safeX = clamp(Number(x ?? 0), -1, 1);
  const safeNaturalW = Number(loadedNaturalSize?.naturalW ?? naturalW ?? 0);
  const safeNaturalH = Number(loadedNaturalSize?.naturalH ?? naturalH ?? 0);
  const ratio =
    safeNaturalW > 0 && safeNaturalH > 0 ? safeNaturalH / safeNaturalW : 1;
  const frameH = Math.max(1, frameW * ratio * safeScale);
  const imgW = frameW * safeScale;
  const empty = Math.max(0, frameW - imgW);
  const leftPx = clamp(((safeX + 1) / 2) * empty, 0, empty);
  const dragEnabled =
    editable &&
    safeScale < 0.999 &&
    empty > 0 &&
    typeof onTransformChange === "function";

  React.useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const rectW = node.getBoundingClientRect().width;
      const layoutW = node.offsetWidth || rectW;
      const nextScaleX =
        node.offsetWidth > 0 ? rectW / node.offsetWidth : 1;
      setFrameW(layoutW);
      setFrameScaleX(
        Number.isFinite(nextScaleX) && nextScaleX > 0 ? nextScaleX : 1,
      );
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
    if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0)
      return;
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
      className={cn("relative w-full overflow-hidden", className)}
      style={{
        height: `${frameH}px`,
        touchAction: dragEnabled ? "none" : "auto",
        cursor: dragEnabled ? (isDragging ? "grabbing" : "grab") : undefined,
      }}
      onPointerDown={(event) => {
        if (!dragEnabled || !onTransformChange) return;
        event.stopPropagation();
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startNormalizedX: safeX,
          started: false,
        };
      }}
      onPointerMove={(event) => {
        if (!dragEnabled || !onTransformChange || !dragRef.current) return;
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
        onTransformChange({ scale: safeScale, x: nextX });
      }}
      onPointerUp={(event) => {
        if (!dragRef.current || event.pointerId !== dragRef.current.pointerId)
          return;
        const started = dragRef.current.started;
        if (started && event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragRef.current = null;
        setIsDragging(false);
        if (started) {
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }
      }}
      onPointerCancel={(event) => {
        if (!dragRef.current || event.pointerId !== dragRef.current.pointerId)
          return;
        const started = dragRef.current.started;
        if (started && event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragRef.current = null;
        setIsDragging(false);
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
        className={cn("absolute top-0 h-auto max-w-none", imgClassName)}
        style={{ width: `${safeScale * 100}%`, left: `${leftPx}px` }}
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
  );
}




