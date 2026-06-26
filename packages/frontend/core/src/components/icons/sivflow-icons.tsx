import type { SVGProps } from 'react';

export type SivflowIconProps = SVGProps<SVGSVGElement>;

export const sivflowIconBaseProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  width: '1em',
  height: '1em',
} as const;
