export type SelectionCapturePoint = {
  x: number;
  y: number;
};

export type SelectionCaptureRect = SelectionCapturePoint & {
  width: number;
  height: number;
};

export type SelectionCaptureShape = "rectangle" | "freehand";

export type SelectionCaptureArea = {
  readonly shape: SelectionCaptureShape;
  readonly rect: SelectionCaptureRect;
  readonly path?: SelectionCapturePoint[];
};
