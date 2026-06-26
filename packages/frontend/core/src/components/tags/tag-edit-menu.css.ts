import { cssVarV2 } from '@toeverything/theme/v2';
import { globalStyle, style } from '@vanilla-extract/css';

export const menuItemListScrollable = style({});

export const menuItemListScrollbar = style({
  transform: 'translateX(4px)',
});

export const menuItemList = style({
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 200,
  overflow: 'auto',
});

globalStyle(`${menuItemList}[data-radix-scroll-area-viewport] > div`, {
  display: 'table !important',
});

export const tagColorIconWrapper = style({
  width: 20,
  height: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const tagColorIcon = style({
  width: 16,
  height: 16,
  borderRadius: '50%',
});

export const mobileTagColorIcon = style({
  width: 20,
  height: 20,
  borderRadius: '50%',
});

export const mobileTagEditInput = style({
  height: 'auto',
  borderRadius: 12,
});

export const parentSelect = style({
  width: '100%',
  height: 36,
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: 8,
  padding: '0 12px',
  background: cssVarV2('layer/background/primary'),
  color: cssVarV2('text/primary'),
});

export const mobileTagEditDeleteRow = style({
  color: cssVarV2('button/error'),
});

export const mobileTagEditTrigger = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const spacer = style({
  flex: 1,
});

export const tagColorIconSelect = style({
  opacity: 0,
  color: cssVarV2('button/primary'),
  width: 20,
  height: 20,
  selectors: {
    '&[data-selected="true"]': {
      opacity: 1,
    },
  },
});
