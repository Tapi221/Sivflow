import { cssVar } from '@toeverything/theme';
import { style, keyframes } from '@vanilla-extract/css';
export const browserWarningStyle = style({
  backgroundColor: cssVar('backgroundWarningColor'),
  color: cssVar('warningColor'),
  width: '100%',
  padding: '8px 16px',
  fontSize: cssVar('fontSm'),
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'absolute',
  zIndex: 1,
});
export const closeButtonStyle = style({
  width: '36px',
  height: '36px',
  color: cssVar('iconColor'),
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  position: 'absolute',
  right: '16px',
});
export const closeIconStyle = style({
  width: '15px',
  height: '15px',
  position: 'relative',
  zIndex: 1,
});

const gradientAnimation = keyframes({
  '0%': { backgroundPosition: '0% 50%' },
  '50%': { backgroundPosition: '100% 50%' },
  '100%': { backgroundPosition: '0% 50%' },
});

export const tipsContainer = style({
  background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)',
  backgroundSize: '200% 200%',
  animation: `${gradientAnimation} 10s ease infinite`,
  color: '#0f172a',
  width: '100%',
  fontSize: cssVar('fontSm'),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  position: 'absolute',
  zIndex: 1,
  gap: '16px',
  containerType: 'inline-size',
  overflow: 'hidden',
  '@media': {
    'screen and (max-width: 520px)': {
      flexWrap: 'wrap',
    },
  },
});

export const patternOverlay = style({
  position: 'absolute',
  inset: 0,
  opacity: 0.15,
  backgroundImage: 'radial-gradient(#0ea5e9 1px, transparent 1px)',
  backgroundSize: '10px 10px',
  pointerEvents: 'none',
  zIndex: 0,
});

export const cloudsOverlay = style({
  position: 'absolute',
  inset: 0,
  opacity: 0.4,
  background: 'radial-gradient(ellipse at top right, rgba(255, 255, 255, 0.8) 0%, transparent 60%), radial-gradient(ellipse at bottom left, rgba(255, 255, 255, 0.6) 0%, transparent 60%)',
  pointerEvents: 'none',
  zIndex: 0,
});
export const tipsMessage = style({
  color: '#334155',
  fontWeight: 600,
  flexGrow: 1,
  flexShrink: 1,
  position: 'relative',
  zIndex: 1,
});
export const tipsRightItem = style({
  display: 'flex',
  flexShrink: 0,
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  position: 'relative',
  zIndex: 1,
  '@media': {
    'screen and (max-width: 520px)': {
      width: '100%',
    },
  },
});
