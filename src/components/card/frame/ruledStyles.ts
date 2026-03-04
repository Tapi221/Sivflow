import type { CSSProperties } from 'react';

export type RuledStyleKind = 'repeat+bottom' | 'repeat-only' | 'bottom-only';

const REPEATING_LAYER = `repeating-linear-gradient(
  to bottom,
  var(--card-ruled-color),
  var(--card-ruled-color) var(--card-ruled-line-px),
  transparent var(--card-ruled-line-px),
  transparent var(--card-row-px)
)`;
const BOTTOM_ONLY_POSITION =
  '0 calc(100% - var(--card-row-px) + var(--card-ruled-line-px))';
const REPEAT_WITHOUT_LAST_ROW_SIZE = '100% calc(100% - var(--card-row-px))';

function buildRepeatLayerStyle(
  backgroundPosition: string,
  backgroundRepeat: CSSProperties['backgroundRepeat']
): Pick<CSSProperties, 'backgroundImage' | 'backgroundSize' | 'backgroundPosition' | 'backgroundRepeat'> {
  return {
    backgroundImage: REPEATING_LAYER,
    backgroundSize: '100% var(--card-row-px)',
    backgroundPosition,
    backgroundRepeat,
  };
}

export function getRuledStyle(kind: RuledStyleKind): Pick<
  CSSProperties,
  'backgroundImage' | 'backgroundSize' | 'backgroundPosition' | 'backgroundRepeat'
> {
  if (kind === 'repeat-only') {
    return buildRepeatLayerStyle('0 0', 'repeat-y');
  }

  if (kind === 'bottom-only') {
    return buildRepeatLayerStyle(BOTTOM_ONLY_POSITION, 'no-repeat');
  }

  return {
    backgroundImage: `
      ${REPEATING_LAYER},
      ${REPEATING_LAYER}
    `,
    backgroundSize: `100% var(--card-row-px), ${REPEAT_WITHOUT_LAST_ROW_SIZE}`,
    backgroundPosition: `${BOTTOM_ONLY_POSITION}, 0 0`,
    backgroundRepeat: 'no-repeat, no-repeat',
  };
}
