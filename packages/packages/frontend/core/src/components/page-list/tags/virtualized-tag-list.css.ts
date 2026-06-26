import { cssVar } from '@toeverything/theme';
import { style } from '@vanilla-extract/css';

export const rootDropTarget = style({
  height: '100%',
  selectors: {
    '&[data-dragged-over=true]': {
      background: cssVar('hoverColor'),
      borderRadius: 8,
    },
  },
});
