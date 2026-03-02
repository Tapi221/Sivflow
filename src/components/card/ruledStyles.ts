import type { CSSProperties } from 'react';

export type RuledStyleKind = 'repeat+bottom' | 'repeat-only' | 'bottom-only';

// NOTE:
// Keep these values identical to the original CardSurface ruled style.
const BOTTOM_LINE_LAYER = 'linear-gradient(to bottom, var(--card-ruled-color), var(--card-ruled-color))';
const REPEATING_LAYER = `repeating-linear-gradient(
  to bottom,
  var(--card-ruled-color),
  var(--card-ruled-color) var(--card-ruled-line-px),
  transparent var(--card-ruled-line-px),
  transparent var(--card-row-px)
)`;

export function getRuledStyle(kind: RuledStyleKind): Pick<
  CSSProperties,
  'backgroundImage' | 'backgroundSize' | 'backgroundPosition' | 'backgroundRepeat'
> {
  if (kind === 'repeat-only') {
    return {
      backgroundImage: REPEATING_LAYER,
      backgroundSize: '100% var(--card-row-px)',
      backgroundPosition: '0 0',
      backgroundRepeat: 'repeat-y',
    };
  }

  if (kind === 'bottom-only') {
    return {
      backgroundImage: BOTTOM_LINE_LAYER,
      backgroundSize: '100% var(--card-ruled-line-px)',
      backgroundPosition: '0 100%',
      backgroundRepeat: 'no-repeat',
    };
  }

  return {
    backgroundImage: `
      ${BOTTOM_LINE_LAYER},
      ${REPEATING_LAYER}
    `,
    backgroundSize: '100% var(--card-ruled-line-px), 100% var(--card-row-px)',
    backgroundPosition: '0 100%, 0 0',
    backgroundRepeat: 'no-repeat, repeat-y',
  };
}
