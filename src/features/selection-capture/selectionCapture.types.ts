export type SelectionCapturePoint = {
  x: number;
  y: number;
};

export type SelectionCaptureRect = SelectionCapturePoint & {
  width: number;
  height: number;
};
