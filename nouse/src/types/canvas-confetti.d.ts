declare module "canvas-confetti" {
  export type CreateTypes = {
    particleCount?: number;
    spread?: number;
    origin?: {
      x?: number;
      y?: number;
    };
    angle?: number;
    startVelocity?: number;
    decay?: number;
    scalar?: number;
    zIndex?: number;
    ticks?: number;
    gravity?: number;
    drift?: number;
    colors?: string[];
    disableForReducedMotion?: boolean;
  };

  const confetti: (options?: CreateTypes) => Promise<null> | null;
  export default confetti;
}
