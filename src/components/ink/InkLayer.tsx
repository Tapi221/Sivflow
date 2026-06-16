import React from "react";
import type { InkDocument, InkEditTool, InkPoint, InkSide, InkStroke } from "@core/domain/card/ink/inkDocument";
import { cloneInkDocument, createEmptyInkDocument, INK_DOCUMENT_VERSION, INK_PAPER_H, INK_PAPER_W, normalizeInkDocument } from "@core/domain/card/ink/inkDocument";
import { Button } from "@web-renderer/chip/button/button/button";
import { Eraser, PenLine, Redo2, Trash2, Undo2 } from "@web-renderer/chip/icons";
import { cn } from "@web-renderer/lib/utils";
import type { InkHistoryState, InkLayerHandle } from "./inkLayer.types";
import { saveInkToStorage } from "./inkStorage";
import type { RectLike } from "@/utils/inkCoords";
import { clientPointToPaperPoint, paperPointToCanvasPoint, squaredDistance } from "@/utils/inkCoords";



interface InkLayerProps {
  cardId?: string | null;
  side: InkSide;
  editable: boolean;
  tool: InkEditTool;
  value?: InkDocument | null;
  onChange?: (next: InkDocument) => void;
  /** @deprecated use value */
  document?: InkDocument | null;
  /** @deprecated use onChange */
  className?: string;
  paperWidth?: number;
  paperHeight?: number;
  eraserRadius?: number;
  /** @deprecated use onChange */
  onDocumentChange?: (next: InkDocument) => void;
  onHistoryChange?: (state: InkHistoryState) => void;
}
interface InkToolbarProps {
  tool: InkEditTool | null;
  canUndo: boolean;
  canRedo: boolean;
  className?: string;
  onToolChange: (next: InkEditTool | null) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}



const TOOL_STYLE: Record<
  Exclude<InkEditTool, "eraser">,
  { color: string; width: number; opacity: number; }
> = {
  pen: {
    color: "#1f2937",
    width: 3,
    opacity: 1,
  },
  highlighter: {
    color: "#f59e0b",
    width: 12,
    opacity: 0.35,
  },
};



const copyStrokes = (strokes: InkStroke[]): InkStroke[] =>
  strokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) => ({ ...point })),
  }));
const buildDocumentFromStrokes = (strokes: InkStroke[]): InkDocument => ({
  version: INK_DOCUMENT_VERSION,
  updatedAt: Date.now(),
  strokes: copyStrokes(strokes),
});
const toDocSignature = (doc: InkDocument): string => {
  return JSON.stringify({
    version: doc.version,
    deletedStrokeIds: doc.deletedStrokeIds ?? [],
    strokes: doc.strokes.map((stroke) => ({
      id: stroke.id,
      tool: stroke.tool,
      width: stroke.width,
      opacity: stroke.opacity,
      pointCount: stroke.points.length,
      first: stroke.points[0] ?? null,
      last: stroke.points[stroke.points.length - 1] ?? null,
    })),
  });
};



const InkLayer = React.memo(React.forwardRef<InkLayerHandle, InkLayerProps>(({ cardId, side, editable, tool, value, onChange, document, className, paperWidth = INK_PAPER_W, paperHeight = INK_PAPER_H, eraserRadius = 28, onDocumentChange, onHistoryChange }, ref) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const baseCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const liveCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const strokesRef = React.useRef<InkStroke[]>([]);
  const redoStackRef = React.useRef<InkStroke[]>([]);

  const activePointerIdRef = React.useRef<number | null>(null);
  const activeStrokeRef = React.useRef<InkStroke | null>(null);
  const pendingDrawPointsRef = React.useRef<InkPoint[]>([]);
  const pendingErasePointRef = React.useRef<InkPoint | null>(null);
  const drawRafRef = React.useRef<number | null>(null);
  const eraseRafRef = React.useRef<number | null>(null);
  const appliedSignatureRef = React.useRef<string>("");

  const readContainerRect = React.useCallback((): RectLike | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const clearCanvas = React.useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    [],
  );

  const drawStroke = React.useCallback(
    (ctx: CanvasRenderingContext2D, stroke: InkStroke) => {
      if (stroke.points.length === 0) return;

      const scaleX = ctx.canvas.width / paperWidth;
      const scaleY = ctx.canvas.height / paperHeight;
      const scale = (scaleX + scaleY) / 2;

      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.globalAlpha = stroke.opacity;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(1, stroke.width * scale);

      const first = paperPointToCanvasPoint(
        stroke.points[0],
        ctx.canvas.width,
        ctx.canvas.height,
        {
          paperWidth,
          paperHeight,
        },
      );

      if (stroke.points.length === 1) {
        ctx.beginPath();
        ctx.arc(
          first.x,
          first.y,
          Math.max(1, ctx.lineWidth / 2),
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.restore();
        return;
      }

      if (stroke.points.length === 2) {
        const second = paperPointToCanvasPoint(
          stroke.points[1],
          ctx.canvas.width,
          ctx.canvas.height,
          {
            paperWidth,
            paperHeight,
          },
        );
        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        ctx.lineTo(second.x, second.y);
        ctx.stroke();
        ctx.restore();
        return;
      }

      // 点列を中点補間して滑らかな線にする
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < stroke.points.length - 1; i += 1) {
        const current = paperPointToCanvasPoint(
          stroke.points[i],
          ctx.canvas.width,
          ctx.canvas.height,
          {
            paperWidth,
            paperHeight,
          },
        );
        const next = paperPointToCanvasPoint(
          stroke.points[i + 1],
          ctx.canvas.width,
          ctx.canvas.height,
          {
            paperWidth,
            paperHeight,
          },
        );
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;
        ctx.quadraticCurveTo(current.x, current.y, midX, midY);
      }
      const last = paperPointToCanvasPoint(
        stroke.points[stroke.points.length - 1],
        ctx.canvas.width,
        ctx.canvas.height,
        { paperWidth, paperHeight },
      );
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.restore();
    },
    [paperHeight, paperWidth],
  );

  const redrawBaseCanvas = React.useCallback(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokesRef.current.forEach((stroke) => drawStroke(ctx, stroke));
  }, [drawStroke]);

  const emitHistory = React.useCallback(() => {
    onHistoryChange?.({
      canUndo: strokesRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
      strokeCount: strokesRef.current.length,
    });
  }, [onHistoryChange]);

  const emitDocumentChange = React.useCallback(() => {
    const nextDocument = buildDocumentFromStrokes(strokesRef.current);
    if (cardId) {
      saveInkToStorage(cardId, side, nextDocument);
    }
    onChange?.(cloneInkDocument(nextDocument));
    onDocumentChange?.(cloneInkDocument(nextDocument));
    emitHistory();
  }, [cardId, emitHistory, onChange, onDocumentChange, side]);

  const stopDrawingRaf = React.useCallback(() => {
    if ((drawRafRef.current !== null && drawRafRef.current !== undefined)) {
      cancelAnimationFrame(drawRafRef.current);
      drawRafRef.current = null;
    }
    if ((eraseRafRef.current !== null && eraseRafRef.current !== undefined)) {
      cancelAnimationFrame(eraseRafRef.current);
      eraseRafRef.current = null;
    }
  }, []);

  const clearLiveCanvas = React.useCallback(() => {
    clearCanvas(liveCanvasRef.current);
  }, [clearCanvas]);

  const scheduleDrawFlush = React.useCallback(() => {
    if ((drawRafRef.current !== null && drawRafRef.current !== undefined)) return;

    drawRafRef.current = requestAnimationFrame(() => {
      drawRafRef.current = null;

      const liveCtx = liveCanvasRef.current?.getContext("2d");
      const activeStroke = activeStrokeRef.current;

      if (!liveCtx || !activeStroke) {
        pendingDrawPointsRef.current = [];
        return;
      }

      const queue = pendingDrawPointsRef.current.splice(0);
      if (queue.length === 0) return;

      for (const point of queue) {
        activeStroke.points.push(point);
      }
      clearLiveCanvas();
      drawStroke(liveCtx, activeStroke);
    });
  }, [clearLiveCanvas, drawStroke]);

  const eraseAtPoint = React.useCallback(
    (point: InkPoint) => {
      if (strokesRef.current.length === 0) return;

      const radiusSquared = eraserRadius * eraserRadius;
      const nextStrokes = strokesRef.current.filter(
        (stroke) =>
          !stroke.points.some(
            (candidate) => squaredDistance(candidate, point) <= radiusSquared,
          ),
      );

      if (nextStrokes.length === strokesRef.current.length) return;

      strokesRef.current = nextStrokes;
      redoStackRef.current = [];

      redrawBaseCanvas();
      clearLiveCanvas();
      emitDocumentChange();
    },
    [clearLiveCanvas, emitDocumentChange, eraserRadius, redrawBaseCanvas],
  );

  const scheduleEraseFlush = React.useCallback(() => {
    if ((eraseRafRef.current !== null && eraseRafRef.current !== undefined)) return;

    eraseRafRef.current = requestAnimationFrame(() => {
      eraseRafRef.current = null;
      const target = pendingErasePointRef.current;
      pendingErasePointRef.current = null;
      if (!target) return;
      eraseAtPoint(target);
    });
  }, [eraseAtPoint]);

  const commitActiveStroke = React.useCallback(() => {
    const activeStroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    pendingDrawPointsRef.current = [];

    if (!activeStroke || activeStroke.points.length === 0) {
      clearLiveCanvas();
      return;
    }

    clearLiveCanvas();
    strokesRef.current = [...strokesRef.current, activeStroke];
    redoStackRef.current = [];

    const baseCtx = baseCanvasRef.current?.getContext("2d");
    if (baseCtx) {
      drawStroke(baseCtx, activeStroke);
    } else {
      redrawBaseCanvas();
    }

    emitDocumentChange();
  }, [clearLiveCanvas, drawStroke, emitDocumentChange, redrawBaseCanvas]);

  const undo = React.useCallback(() => {
    const current = strokesRef.current;
    if (current.length === 0) return;

    const next = current.slice(0, -1);
    const removed = current[current.length - 1];
    strokesRef.current = next;
    redoStackRef.current = [...redoStackRef.current, removed];

    redrawBaseCanvas();
    clearLiveCanvas();
    emitDocumentChange();
  }, [clearLiveCanvas, emitDocumentChange, redrawBaseCanvas]);

  const redo = React.useCallback(() => {
    const redoStack = redoStackRef.current;
    if (redoStack.length === 0) return;

    const restored = redoStack[redoStack.length - 1];
    redoStackRef.current = redoStack.slice(0, -1);
    strokesRef.current = [...strokesRef.current, restored];

    redrawBaseCanvas();
    clearLiveCanvas();
    emitDocumentChange();
  }, [clearLiveCanvas, emitDocumentChange, redrawBaseCanvas]);

  const clear = React.useCallback(() => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current = [];
    redoStackRef.current = [];
    activeStrokeRef.current = null;
    pendingDrawPointsRef.current = [];
    pendingErasePointRef.current = null;

    redrawBaseCanvas();
    clearLiveCanvas();
    emitDocumentChange();
  }, [clearLiveCanvas, emitDocumentChange, redrawBaseCanvas]);

  React.useImperativeHandle(
    ref,
    () => ({
      undo,
      redo,
      clear,
    }),
    [clear, redo, undo],
  );

  const initializeDocument = React.useCallback(() => {
    const incoming = value ?? document ?? createEmptyInkDocument();
    const initialDocument = normalizeInkDocument(incoming);

    const signature = toDocSignature(initialDocument);
    if (signature === appliedSignatureRef.current) return;

    appliedSignatureRef.current = signature;
    strokesRef.current = copyStrokes(initialDocument.strokes);
    redoStackRef.current = [];
    activeStrokeRef.current = null;
    pendingDrawPointsRef.current = [];
    pendingErasePointRef.current = null;

    redrawBaseCanvas();
    clearLiveCanvas();
    emitHistory();
  }, [clearLiveCanvas, document, emitHistory, redrawBaseCanvas, value]);

  const syncCanvasSize = React.useCallback(() => {
    const rect = readContainerRect();
    if (!rect) return;

    const dpr = window.devicePixelRatio ?? 1;
    const nextWidth = Math.max(1, Math.round(rect.width * dpr));
    const nextHeight = Math.max(1, Math.round(rect.height * dpr));

    [baseCanvasRef.current, liveCanvasRef.current].forEach((canvas) => {
      if (!canvas) return;
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    });

    redrawBaseCanvas();
    clearLiveCanvas();

    const activeStroke = activeStrokeRef.current;
    const liveCtx = liveCanvasRef.current?.getContext("2d");
    if (activeStroke && liveCtx) {
      drawStroke(liveCtx, activeStroke);
    }
  }, [clearLiveCanvas, drawStroke, readContainerRect, redrawBaseCanvas]);

  React.useEffect(() => {
    initializeDocument();
  }, [initializeDocument]);

  React.useEffect(() => {
    syncCanvasSize();
    const target = containerRef.current;
    if (!target || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      syncCanvasSize();
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [syncCanvasSize]);

  React.useEffect(() => {
    return () => {
      stopDrawingRaf();
    };
  }, [stopDrawingRaf]);

  const clientToPaperPoint = React.useCallback(
    (
      clientX: number,
      clientY: number,
      pressure?: number,
      now?: number,
    ): InkPoint | null => {
      const rect = readContainerRect();
      if (!rect) return null;

      return clientPointToPaperPoint(clientX, clientY, rect, {
        pressure,
        now: now ?? Date.now(),
        paperWidth,
        paperHeight,
      });
    },
    [paperHeight, paperWidth, readContainerRect],
  );

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!editable) return;
      if (
        event.button !== 0 &&
        event.pointerType !== "touch" &&
        event.pointerType !== "pen"
      )
        return;

      const point = clientToPaperPoint(
        event.clientX,
        event.clientY,
        event.pressure,
        Date.now(),
      );
      if (!point) return;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      activePointerIdRef.current = event.pointerId;

      if (tool === "eraser") {
        pendingErasePointRef.current = point;
        scheduleEraseFlush();
        return;
      }

      const style =
        TOOL_STYLE[tool === "highlighter" ? "highlighter" : "pen"];
      activeStrokeRef.current = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tool: tool === "highlighter" ? "highlighter" : "pen",
        color: style.color,
        width: style.width,
        opacity: style.opacity,
        points: [point],
        createdAt: Date.now(),
      };

      const liveCtx = liveCanvasRef.current?.getContext("2d");
      if (!liveCtx || !activeStrokeRef.current) return;

      drawStroke(liveCtx, activeStrokeRef.current);
    },
    [clientToPaperPoint, drawStroke, editable, scheduleEraseFlush, tool],
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!editable) return;
      if (activePointerIdRef.current !== event.pointerId) return;

      event.preventDefault();

      if (tool === "eraser") {
        const point = clientToPaperPoint(
          event.clientX,
          event.clientY,
          event.pressure,
          Date.now(),
        );
        if (!point) return;
        pendingErasePointRef.current = point;
        scheduleEraseFlush();
        return;
      }

      if (!activeStrokeRef.current) return;

      const nativeEvent = event.nativeEvent;
      const coalesced =
        typeof nativeEvent.getCoalescedEvents === "function"
          ? nativeEvent.getCoalescedEvents()
          : [nativeEvent];

      const nextPoints: InkPoint[] = [];
      for (const sample of coalesced) {
        const next = clientToPaperPoint(
          sample.clientX,
          sample.clientY,
          sample.pressure,
          Date.now(),
        );
        if (!next) continue;
        nextPoints.push(next);
      }
      if (nextPoints.length === 0) return;

      // 微小移動点を間引いてノイズ低減（筆跡はcoalescedで十分滑らか）
      let lastPoint =
        activeStrokeRef.current.points[
          activeStrokeRef.current.points.length - 1
        ];
      const minDistSq = 0.35 * 0.35;
      for (const next of nextPoints) {
        if (!lastPoint || squaredDistance(lastPoint, next) >= minDistSq) {
          pendingDrawPointsRef.current.push(next);
          lastPoint = next;
        }
      }
      scheduleDrawFlush();
    },
    [
      clientToPaperPoint,
      editable,
      scheduleDrawFlush,
      scheduleEraseFlush,
      tool,
    ],
  );

  const finalizePointer = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== event.pointerId) return;

      event.preventDefault();
      stopDrawingRaf();

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (tool !== "eraser") {
        commitActiveStroke();
      }

      activePointerIdRef.current = null;
      pendingErasePointRef.current = null;
    },
    [commitActiveStroke, stopDrawingRaf, tool],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0",
        editable ? "pointer-events-auto" : "pointer-events-none",
        className,
      )}
      style={{ touchAction: editable ? "none" : "auto" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finalizePointer}
      onPointerCancel={finalizePointer}
    >
      <canvas
        ref={baseCanvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
      <canvas
        ref={liveCanvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
}),
);
InkLayer.displayName = "InkLayer";
const InkToolbar = React.memo(({ tool, canUndo, canRedo, className, onToolChange, onUndo, onRedo, onClear }: InkToolbarProps) => {
  return (<div className={cn("pointer-events-auto inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur", className)} data-card-no-pan="true" > <Button type="button" size="icon" variant={tool === "pen" ? "default" : "ghost"} className="h-7 w-7" onClick={() => onToolChange(tool === "pen" ? null : "pen")} > <PenLine className="h-3.5 w-3.5" /> </Button> <Button type="button" size="icon" variant={tool === "eraser" ? "default" : "ghost"} className="h-7 w-7" onClick={() => onToolChange(tool === "eraser" ? null : "eraser")} > <Eraser className="h-3.5 w-3.5" /> </Button> <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onUndo} disabled={!canUndo} > <Undo2 className="h-3.5 w-3.5" /> </Button> <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onRedo} disabled={!canRedo} > <Redo2 className="h-3.5 w-3.5" /> </Button> <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:text-rose-600" onClick={onClear} disabled={!canUndo} > <Trash2 className="h-3.5 w-3.5" /> </Button> </div>);
});
InkToolbar.displayName = "InkToolbar";

export { InkLayer, InkToolbar };
