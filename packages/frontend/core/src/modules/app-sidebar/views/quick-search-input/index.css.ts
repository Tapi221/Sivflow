import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';
export const root = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  fontSize: cssVar('fontSm'),
  width: '28px',
  height: '28px',
  userSelect: 'none',
  cursor: 'pointer',
  padding: 0,
  position: 'relative',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  ':hover': {
    background: cssVarV2('layer/background/hoverOverlay'),
  },
});
export const icon = style({
  color: cssVarV2('icon/primary'),
  fontSize: '20px',
});
export const spacer = style({
  flex: 1,
});
export const shortcutHint = style({
  color: cssVarV2('text/tertiary'),
  fontSize: cssVar('fontBase'),
});
export const quickSearchBarEllipsisStyle = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
