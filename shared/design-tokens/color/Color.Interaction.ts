type InteractionColor = {
  accentHoverAlpha: number;
};

const INTERACTION_COLOR = {
  accentHoverAlpha: 0.08,
} as const satisfies InteractionColor;

export { INTERACTION_COLOR };
export type { InteractionColor };
