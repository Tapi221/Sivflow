import { style } from '@vanilla-extract/css';

export const rootDropTarget = style({
  paddingBottom: 4,
});

export const placeholder = style({
  display: 'none',
  selectors: {
    '&:only-child': {
      display: 'initial',
    },
  },
});
