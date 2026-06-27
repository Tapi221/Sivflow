import { cssVar } from '@toeverything/theme';
import { style, keyframes } from '@vanilla-extract/css';

const gradientAnimation = keyframes({
  '0%': { backgroundPosition: '0% 50%' },
  '50%': { backgroundPosition: '100% 50%' },
  '100%': { backgroundPosition: '0% 50%' },
});

export const root = style({
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)',
  backgroundSize: '200% 200%',
  animation: `${gradientAnimation} 10s ease infinite`,
  borderRadius: '12px',
  padding: '12px',
  boxShadow: '0 4px 10px -2px rgba(125, 211, 252, 0.3), 0 2px 4px -1px rgba(125, 211, 252, 0.15)',
  overflow: 'hidden',
  color: '#0f172a',
  fontFamily: 'Inter, sans-serif',
  margin: '6px 8px',
});

export const patternOverlay = style({
  position: 'absolute',
  inset: 0,
  opacity: 0.15,
  backgroundImage: 'radial-gradient(#0ea5e9 1px, transparent 1px)',
  backgroundSize: '10px 10px',
  pointerEvents: 'none',
});

export const cloudsOverlay = style({
  position: 'absolute',
  inset: 0,
  opacity: 0.4,
  background: 'radial-gradient(ellipse at top right, rgba(255, 255, 255, 0.8) 0%, transparent 60%), radial-gradient(ellipse at bottom left, rgba(255, 255, 255, 0.6) 0%, transparent 60%)',
  pointerEvents: 'none',
});

export const description = style({
  fontSize: '11px',
  lineHeight: '1.4',
  marginBottom: '10px',
  position: 'relative',
  zIndex: 1,
  color: '#334155',
  fontWeight: 600,
  paddingRight: '16px',
});

export const button = style({
  background: '#0f172a',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 0',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  width: '100%',
  position: 'relative',
  zIndex: 1,
  transition: 'transform 0.2s, background 0.2s, box-shadow 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  selectors: {
    '&:hover': {
      background: '#1e293b',
      transform: 'translateY(-1px)',
      boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },
});

export const closeIcon = style({
  position: 'absolute',
  top: '8px',
  right: '8px',
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.5)',
  color: '#334155',
  cursor: 'pointer',
  transition: 'background 0.2s, color 0.2s',
  selectors: {
    '&:hover': {
      background: 'rgba(0, 0, 0, 0.3)',
      color: '#fff',
    },
  },
});
