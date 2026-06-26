import { globalStyle, style } from '@vanilla-extract/css';

export const workspaceAndUserWrapper = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  width: 0,
  flex: 1,
  minWidth: 0,
  height: 42,
});
export const quickSearchAndNewPage = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 0',
  marginLeft: -8,
  marginRight: -6,
});
export const primaryActionsRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '0',
  width: '100%',
});
export const topSidebarContainer = style({
  paddingTop: 0,
  paddingBottom: 0,
});
export const primaryActionsGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  minWidth: 0,
});
export const primaryActionItem = style({
  width: '28px !important',
  height: 28,
  minWidth: '28px !important',
  flex: '0 0 auto',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
});
globalStyle(`${primaryActionItem} > button`, {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
});
globalStyle(`${primaryActionItem} > button[data-active="true"]::before`, {
  opacity: 1,
});
export const primaryActionLink = style({
  display: 'inline-flex',
  width: 28,
  height: 28,
  borderRadius: '50%',
  textDecoration: 'none',
  color: 'inherit',
});
globalStyle(`${primaryActionLink} > button`, {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
});
globalStyle(`${primaryActionLink} > button[data-active="true"]::before`, {
  opacity: 1,
});
export const primaryActionsSpacer = style({
  flex: 1,
  minWidth: 8,
});
export const quickSearch = style({
  width: 0,
  flex: 1,
});
export const quickSearchCompact = style({
  width: 28,
  height: 28,
  flex: '0 0 auto',
  borderRadius: '50%',
  overflow: 'hidden',
});
export const primaryAddButton = style({
  flex: '0 0 auto',
  marginLeft: 'auto',
});

export const workspaceWrapper = style({
  width: 0,
  flex: 1,
  minWidth: 0,
});

export const bottomContainer = style({
  gap: 8,
});