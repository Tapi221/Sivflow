export const resolveWheelZoomStepCount = ({
  deltaY,
  deltaPerStep = 80,
}: {
  deltaY: number;
  deltaPerStep?: number;
}) => {
  const safeDeltaPerStep =
    Number.isFinite(deltaPerStep) && deltaPerStep > 0 ? deltaPerStep : 80;

  return Math.max(1, Math.round(Math.abs(deltaY) / safeDeltaPerStep));
};
