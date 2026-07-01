type InteractionColor = {
  accentHoverAlpha: number;
  accentPressedAlpha: number;
  accentSelectedAlpha: number;
  accentOutlineAlpha: number;
};



const INTERACTION_COLOR = {
  accentHoverAlpha: 0.08,
  accentPressedAlpha: 0.12,
  accentSelectedAlpha: 0.14,
  accentOutlineAlpha: 0.24,
} as const satisfies InteractionColor;



export { INTERACTION_COLOR };


export type { InteractionColor };
