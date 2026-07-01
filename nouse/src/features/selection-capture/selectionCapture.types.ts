type SelectionCapturePoint = {
  x: number;
  y: number;
};
type SelectionCaptureRect = SelectionCapturePoint & { width: number;
  height: number;
};
type SelectionCaptureShape = "rectangle" | "freehand";
type SelectionCaptureArea = {
  readonly shape: SelectionCaptureShape;
  readonly rect: SelectionCaptureRect;
  readonly path?: SelectionCapturePoint[];
};

export type { SelectionCapturePoint, SelectionCaptureRect, SelectionCaptureShape, SelectionCaptureArea };
