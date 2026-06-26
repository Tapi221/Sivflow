import { cssVar } from '@toeverything/theme';
import { createVar, style } from '@vanilla-extract/css';

export const levelIndent = createVar();

export const root = style({
  display: 'flex',
  flexDirection: 'column',
  padding: '8px 16px',
  width: '100%',
});

export const itemContainer = style({
  display: 'flex',
  alignItems: 'center',
  paddingLeft: levelIndent,
  minHeight: '30px',
  borderRadius: '4px',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      background: cssVar('hoverColor'),
    },
    '&[data-dragging=\"true\"]': {
      opacity: 0.5,
    },
    '&[data-dragged-over=\"true\"]': {
      background: cssVar('hoverColor'),
      boxShadow: `inset 0 0 0 2px ${cssVar('primaryColor')}`,
    },
  },
});

export const toggleIcon = style({
  width: '20px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '4px',
  color: cssVar('iconColor'),
  borderRadius: '2px',
  selectors: {
    '&:hover': {
      background: cssVar('hoverColor'),
      color: cssVar('textPrimaryColor'),
    },
  },
});

export const collapsedIcon = style({
  transition: 'transform 0.2s ease-in-out',
  fontSize: 16,
  selectors: {
    '&[data-collapsed="true"]': {
      transform: 'rotate(-90deg)',
    },
  },
});

export const checkbox = style({
  marginRight: '8px',
  color: cssVar('iconColor'),
});

export const itemContent = style({
  fontSize: cssVar('fontSm'),
  color: cssVar('textColor'),
  userSelect: 'none',
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const childrenContainer = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  selectors: {
    '&::before': {
      content: '""',
      position: 'absolute',
      left: `calc(${levelIndent} + 9.5px)`,
      top: 0,
      bottom: 0,
      width: '1px',
      backgroundColor: cssVar('borderColor'),
      zIndex: 0,
      pointerEvents: 'none',
    },
  },
});
