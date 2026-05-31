import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import type { SelectionCapturePoint, SelectionCaptureRect } from "./selectionCapture.types";

const MIN_SELECTION_SIZE_PX = 5;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const normalizeRect = (
  start: SelectionCapturePoint,
  end: SelectionCapturePoint,
): SelectionCaptureRect => {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return { x, y, width, height };
};

type SelectionCaptureTargetRef = {
  readonly current: HTMLElement | null;
};

type SelectionCaptureOverlayProps = {
  targetRef: SelectionCaptureTargetRef;
  active: boolean;
  busy?: boolean;
  onCancel: () => void;
  onCapture: (rect: SelectionCaptureRect) => Promise<void> | void;
};

export const SelectionCaptureOverlay = ({
  targetRef,
  active,
  busy = false,
  onCancel,
  onCapture,
}: SelectionCaptureOverlayProps) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [startPoint, setStartPoint] = useState<SelectionCapturePoint | null>(null);
  const [endPoint, setEndPoint] = useState<SelectionCapturePoint | null>(null);

  const selectionRect = useMemo(() => {
    if (!startPoint || !endPoint) return null;
    return normalizeRect(startPoint, endPoint);
  }, [endPoint, startPoint]);

  const getBoundedPoint = useCallback((event: PointerEvent<HTMLDivElement>): SelectionCapturePoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp(event.clientX - bounds.left, 0, bounds.width),
      y: clamp(event.clientY - bounds.top, 0, bounds.height),
    };
  }, []);

  const resetSelection = useCallback(() => {
    setStartPoint(null);
    setEndPoint(null);
  }, []);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || busy) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getBoundedPoint(event);
    setStartPoint(point);
    setEndPoint(point);
  }, [busy, getBoundedPoint]);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!startPoint || busy) return;

    setEndPoint(getBoundedPoint(event));
  }, [busy, getBoundedPoint, startPoint]);

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!startPoint || busy) return;

    const nextRect = normalizeRect(startPoint, getBoundedPoint(event));
    resetSelection();

    if (
      nextRect.width < MIN_SELECTION_SIZE_PX ||
      nextRect.height < MIN_SELECTION_SIZE_PX ||
      !targetRef.current
    ) {
      return;
    }

    void onCapture(nextRect);
  }, [busy, getBoundedPoint, onCapture, resetSelection, startPoint, targetRef]);

  const handleContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    resetSelection();
    onCancel();
  }, [onCancel, resetSelection]);

  useEffect(() => {
    if (!active) {
      resetSelection();
      return;
    }

    overlayRef.current?.focus();
  }, [active, resetSelection]);

  if (!active) return null;

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      data-selection-capture-ignore="true"
      className="absolute inset-0 z-50 cursor-crosshair overflow-hidden outline-none"
      role="presentation"
      onContextMenu={handleContextMenu}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          resetSelection();
          onCancel();
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {selectionRect ? (
        <>
          <div className="absolute left-0 top-0 right-0 bg-black/20" style={{ height: selectionRect.y }} />
          <div className="absolute left-0 bg-black/20" style={{ top: selectionRect.y, width: selectionRect.x, height: selectionRect.height }} />
          <div className="absolute right-0 bg-black/20" style={{ top: selectionRect.y, left: selectionRect.x + selectionRect.width, height: selectionRect.height }} />
          <div className="absolute left-0 right-0 bottom-0 bg-black/20" style={{ top: selectionRect.y + selectionRect.height }} />
          <div
            className="absolute border border-black"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
            }}
          />
          <div
            className="absolute border border-dashed border-white"
            style={{
              left: selectionRect.x + 1,
              top: selectionRect.y + 1,
              width: Math.max(0, selectionRect.width - 2),
              height: Math.max(0, selectionRect.height - 2),
            }}
          />
          <div
            className="absolute rounded border border-slate-900/70 bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
            style={{
              left: Math.min(selectionRect.x, Math.max(0, selectionRect.x + selectionRect.width - 96)),
              top: selectionRect.y > 24 ? selectionRect.y - 24 : selectionRect.y + selectionRect.height + 6,
            }}
          >
            {Math.round(selectionRect.width)} × {Math.round(selectionRect.height)}
          </div>
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-white/30 bg-slate-950/70 px-3 py-1 text-xs font-medium text-white shadow-sm">
            ドラッグして範囲を選択 / Esc でキャンセル
          </div>
        </>
      )}

      {busy ? (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-slate-950/80 px-3 py-1 text-xs font-medium text-white shadow-sm">
          コピー中...
        </div>
      ) : null}
    </div>
  );
};
