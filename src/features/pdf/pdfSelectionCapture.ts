import { cropCanvasToBlob } from "@/features/selection-capture/canvasSelectionCapture";
import type { SelectionCaptureArea, SelectionCaptureRect } from "@/features/selection-capture/selectionCapture.types";



const getCanvasRectRelativeToTarget = (target: HTMLElement, canvas: HTMLCanvasElement): SelectionCaptureRect => {
  const targetRect = target.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  return {
    x: canvasRect.left - targetRect.left,
    y: canvasRect.top - targetRect.top,
    width: canvasRect.width,
    height: canvasRect.height,
  };
};
const getIntersectionRect = (left: SelectionCaptureRect, right: SelectionCaptureRect): SelectionCaptureRect | null => {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const rightEdge = Math.min(left.x + left.width, right.x + right.width);
  const bottomEdge = Math.min(left.y + left.height, right.y + right.height);
  const width = rightEdge - x;
  const height = bottomEdge - y;

  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
};
const toCanvasSourceRect = (canvas: HTMLCanvasElement, canvasRect: SelectionCaptureRect, intersectionRect: SelectionCaptureRect): SelectionCaptureRect => {
  const scaleX = canvas.width / Math.max(canvasRect.width, 1);
  const scaleY = canvas.height / Math.max(canvasRect.height, 1);

  return {
    x: (intersectionRect.x - canvasRect.x) * scaleX,
    y: (intersectionRect.y - canvasRect.y) * scaleY,
    width: intersectionRect.width * scaleX,
    height: intersectionRect.height * scaleY,
  };
};
const getCaptureCandidateCanvases = (target: HTMLElement, area: SelectionCaptureArea): Array<{ canvas: HTMLCanvasElement; sourceRect: SelectionCaptureRect; }> => {
  return Array.from(target.querySelectorAll<HTMLCanvasElement>("canvas")).flatMap((canvas) => {
    const canvasRect = getCanvasRectRelativeToTarget(target, canvas);
    const intersectionRect = getIntersectionRect(area.rect, canvasRect);
    if (!intersectionRect) return [];

    return [{ canvas, sourceRect: toCanvasSourceRect(canvas, canvasRect, intersectionRect) }];
  });
};
const capturePdfViewerAreaToBlob = async (target: HTMLElement, area: SelectionCaptureArea): Promise<Blob> => {
  const [candidate] = getCaptureCandidateCanvases(target, area);
  if (!candidate) throw new Error("PDF範囲の画像を取得できませんでした。");

  return cropCanvasToBlob(candidate.canvas, candidate.sourceRect);
};



export { capturePdfViewerAreaToBlob };
