import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const content = style({
  // to avoid content clipped
  width: `calc(100% + 20px)`,
  padding: '10px 10px 20px 10px',
  marginLeft: '-10px',
});

export const section = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '12px 0px',
});
export const label = style({
  fontSize: cssVar('fontSm'),
  fontWeight: 600,
  lineHeight: '22px',
  color: cssVarV2.text.primary,
});
const baseFormInput = style({
  fontSize: 15,
  fontWeight: 500,
  lineHeight: '24px',
  color: cssVarV2.text.primary,
  border: `1px solid ${cssVarV2.layer.insideBorder.blackBorder}`,
});
export const input = style([
  baseFormInput,
  {
    borderRadius: 4,
    padding: '8px 10px',
  },
]);
export const select = style([
  baseFormInput,
  {
    borderRadius: 8,
    padding: '10px',
  },
]);

/** ローカル Vault 作成ボタン用コンテナ */
export const vaultSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '8px 0px 4px',
  borderTop: `1px solid ${cssVarV2.layer.insideBorder.blackBorder}`,
  marginTop: 8,
});

export const vaultSectionLabel = style({
  fontSize: cssVar('fontXs'),
  color: cssVarV2.text.secondary,
  lineHeight: '18px',
});

export const vaultButton = style({
  width: '100%',
  justifyContent: 'flex-start',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.blackBorder}`,
  background: 'transparent',
  cursor: 'pointer',
  fontSize: cssVar('fontSm'),
  fontWeight: 500,
  color: cssVarV2.text.primary,
  transition: 'background 0.15s',
  selectors: {
    '&:hover': {
      background: cssVarV2.layer.background.hoverOverlay,
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
});
