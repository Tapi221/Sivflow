import { cssVarV2 } from '@toeverything/theme/v2';
import { createVar, style } from '@vanilla-extract/css';

export const sidebarOffsetVar = createVar();

export const root = style({
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: cssVarV2('layer/background/primary'),
  selectors: {
    '&[data-translucent="true"]': {
      background: 'transparent',
    },
  },
});

export const body = style({
  flex: 1,
  paddingTop: 52,
  display: 'flex',
  minHeight: 0,
});

export const appTabsHeader = style({
  zIndex: 1,
  position: 'absolute',
  top: 0,
});

export const splitViewFallback = style({
  width: '100%',
  height: '100%',
  position: 'absolute',
  bottom: 0,
  right: 0,
  zIndex: 0,
  background: cssVarV2('layer/background/primary'),
});

export const loadFailurePanel = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px',
});

export const loadFailureCard = style({
  width: 'min(560px, 100%)',
  borderRadius: 20,
  padding: 24,
  background: cssVarV2('layer/background/primary'),
  boxShadow: '0 24px 80px rgba(15, 23, 42, 0.08)',
  border: '1px solid rgba(15, 23, 42, 0.08)',
  color: cssVarV2('text/primary'),
});

export const loadFailureEyebrow = style({
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: cssVarV2('text/secondary'),
});

export const loadFailureTitle = style({
  margin: '10px 0 0',
  fontSize: 28,
  lineHeight: 1.2,
});

export const loadFailureText = style({
  margin: '12px 0 0',
  fontSize: 15,
  lineHeight: 1.6,
  color: cssVarV2('text/secondary'),
});

export const loadFailureUrl = style({
  display: 'block',
  marginTop: 16,
  padding: '12px 14px',
  borderRadius: 12,
  background: 'rgba(15, 23, 42, 0.04)',
  color: cssVarV2('text/primary'),
  fontSize: 13,
  wordBreak: 'break-all',
});

export const loadFailureMeta = style({
  margin: '12px 0 0',
  fontSize: 13,
  color: cssVarV2('text/secondary'),
});

export const loadFailureHint = style({
  margin: '12px 0 0',
  fontSize: 13,
  lineHeight: 1.6,
  color: cssVarV2('text/secondary'),
});

export const loadFailureActions = style({
  display: 'flex',
  gap: 12,
  marginTop: 20,
  flexWrap: 'wrap',
});

export const loadFailureButton = style({
  appearance: 'none',
  border: '1px solid rgba(15, 23, 42, 0.12)',
  borderRadius: 999,
  background: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
  padding: '10px 16px',
  selectors: {
    '&:hover': {
      background: 'rgba(15, 23, 42, 0.06)',
    },
  },
});
