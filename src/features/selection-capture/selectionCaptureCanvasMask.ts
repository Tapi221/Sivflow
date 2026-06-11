import type { SelectionCaptureArea, SelectionCapturePoint } from "./selectionCapture.types";



const drawFreehandPath = (context: CanvasRenderingContext2D, path: SelectionCapturePoint[]): void => {
  if (path.length === 0) return;

  context.beginPath();
  context.moveTo(path[0].x, path[0].y);
  path.slice(1).forEach((point) => {
    context.lineTo(point.x, point.y);
  });
  context.closePath();
};
const applySelectionCaptureMask = (context: CanvasRenderingContext2D, area: SelectionCaptureArea): void => {
  if (area.shape !== "freehand" || !area.path || area.path.length < 3) return;

  context.globalCompositeOperation = "destination-in";
  drawFreehandPath(context, area.path);
  context.fill();
  context.globalCompositeOperation = "source-over";
};



export { applySelectionCaptureMask };
