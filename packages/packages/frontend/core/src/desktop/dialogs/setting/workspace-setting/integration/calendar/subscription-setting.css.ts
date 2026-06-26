import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const item = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  minHeight: 30,
  padding: '0 6px',
  borderRadius: 4,
  cursor: 'pointer',
  color: 'inherit',
  fontSize: cssVar('fontSm'),
  userSelect: 'none',
  selectors: {
    '&:hover': {
      background: cssVar('hoverColor'),
    },
    '&:focus-visible': {
      outline: 'none',
      boxShadow: `0 0 0 2px ${cssVarV2.layer.insideBorder.border}`,
    },
  },
});

export const color = style({
  width: 10,
  height: 10,
  borderRadius: 999,
  flexShrink: 0,
});

export const info = style({
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
});

export const name = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  lineHeight: cssVar('lineHeight'),
  color: cssVarV2.text.primary,
});

export const meta = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 12,
  lineHeight: '18px',
  color: cssVarV2.text.secondary,
});