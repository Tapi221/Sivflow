const DEFAULT_WHEEL_DELTA_PER_ZOOM_STEP = 120;



const resolveWheelZoomStepCount = ({ deltaY, deltaPerStep = DEFAULT_WHEEL_DELTA_PER_ZOOM_STEP }: { deltaY: number; deltaPerStep?: number }) => {
  const safeDeltaPerStep = Number.isFinite(deltaPerStep) && deltaPerStep > 0 ? deltaPerStep : DEFAULT_WHEEL_DELTA_PER_ZOOM_STEP;
  return Math.max(1, Math.round(Math.abs(deltaY) / safeDeltaPerStep));
};



export { resolveWheelZoomStepCount };
