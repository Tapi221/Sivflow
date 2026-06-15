type InteractionColor = {
  accentHoverAlpha: number;
  accentPressedAlpha: number;
};

const INTERACTION_COLOR = {
  accentHoverAlpha: 0.08,
  accentPressedAlpha: 0.12,
} as const satisfies InteractionColor;

export { INTERACTION_COLOR };
export type { InteractionColor };
