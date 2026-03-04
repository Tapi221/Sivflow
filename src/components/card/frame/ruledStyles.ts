import type { CSSProperties } from 'react';

export type RuledStyleKind = 'repeat+bottom' | 'repeat-only' | 'bottom-only';

const REPEATING_LAYER = `repeating-linear-gradient(
  to bottom,
  var(--card-ruled-color),
  var(--card-ruled-color) var(--card-ruled-line-px),
  transparent var(--card-ruled-line-px),
  transparent var(--card-row-px)
)`;
const REPEAT_WITHOUT_LAST_ROW_SIZE = '100% calc(100% - var(--card-row-px))';
const BOTTOM_LINE_LAYER = 'linear-gradient(var(--card-ruled-color), var(--card-ruled-color))';
const BOTTOM_LINE_POSITION = '0 calc(100% - var(--card-ruled-line-px))';
const BOTTOM_LINE_SIZE = '100% var(--card-ruled-line-px)';
const withRuledPhase = (y: string) => `0 calc(${y} + var(--card-ruled-phase-px, 0px))`;

function buildRepeatLayerStyle(
  backgroundPositionY: string,
  backgroundRepeat: CSSProperties['backgroundRepeat']
): Pick<CSSProperties, 'backgroundImage' | 'backgroundSize' | 'backgroundPosition' | 'backgroundRepeat'> {
  return {
    backgroundImage: REPEATING_LAYER,
    backgroundSize: '100% var(--card-row-px)',
    backgroundPosition: withRuledPhase(backgroundPositionY),
    backgroundRepeat,
  };
}

export function getRuledStyle(kind: RuledStyleKind): Pick<
  CSSProperties,
  'backgroundImage' | 'backgroundSize' | 'backgroundPosition' | 'backgroundRepeat'
> {
  if (kind === 'repeat-only') {
    return buildRepeatLayerStyle('0px', 'repeat-y');
  }

  if (kind === 'bottom-only') {
    return {
      backgroundImage: BOTTOM_LINE_LAYER,
      backgroundSize: BOTTOM_LINE_SIZE,
      backgroundPosition: BOTTOM_LINE_POSITION,
      backgroundRepeat: 'no-repeat',
    };
  }

  return {
    backgroundImage: `
      ${BOTTOM_LINE_LAYER},
      ${REPEATING_LAYER}
    `,
    backgroundSize: `${BOTTOM_LINE_SIZE}, ${REPEAT_WITHOUT_LAST_ROW_SIZE}`,
    backgroundPosition: `${BOTTOM_LINE_POSITION}, ${withRuledPhase('0px')}`,
    backgroundRepeat: 'no-repeat, no-repeat',
  };
}
