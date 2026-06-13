import type { InkPoint } from "@core/domain/card/ink/inkDocument";
import { INK_PAPER_H, INK_PAPER_W } from "@core/domain/card/ink/inkDocument";



type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};



const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const safePressure = (pressure: number | undefined): number => {
  if (typeof pressure !== "number" || !Number.isFinite(pressure)) return 0.5;
  return clamp(pressure, 0, 1);
};
const clientPointToPaperPoint = (clientX: number, clientY: number, rect: RectLike, options?: { pressure?: number;
  now?: number;
  paperWidth?: number;
  paperHeight?: number;
},
): InkPoint => {
  const paperWidth = options?.paperWidth ?? INK_PAPER_W;
  const paperHeight = options?.paperHeight ?? INK_PAPER_H;

  const width = rect.width > 0 ? rect.width : 1;
  const height = rect.height > 0 ? rect.height : 1;

  const x = clamp(((clientX - rect.left) / width) * paperWidth, 0, paperWidth);
  const y = clamp(
    ((clientY - rect.top) / height) * paperHeight,
    0,
    paperHeight,
  );

  return {
    x,
    y,
    t: options?.now ?? Date.now(),
    p: safePressure(options?.pressure),
  };
};
const paperPointToCanvasPoint = (point: Pick<InkPoint, "x" | "y">, canvasWidth: number, canvasHeight: number, options?: { paperWidth?: number;
  paperHeight?: number;
},
) => {
  const paperWidth = options?.paperWidth ?? INK_PAPER_W;
  const paperHeight = options?.paperHeight ?? INK_PAPER_H;

  const safeCanvasWidth = canvasWidth > 0 ? canvasWidth : 1;
  const safeCanvasHeight = canvasHeight > 0 ? canvasHeight : 1;

  return {
    x: (point.x / paperWidth) * safeCanvasWidth,
    y: (point.y / paperHeight) * safeCanvasHeight,
  };
};
const squaredDistance = (a: Pick<InkPoint, "x" | "y">, b: Pick<InkPoint, "x" | "y">): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};



export { clientPointToPaperPoint, paperPointToCanvasPoint, squaredDistance };


export type { RectLike };
