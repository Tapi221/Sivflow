import { cssVarV2 } from '@toeverything/theme/v2';
import { globalStyle, style } from '@vanilla-extract/css';
export const root = style({
  display: 'inline-flex',
  height: '1em',
  width: '1em',
  alignItems: 'center',
  justifyContent: 'center',
});

// primary color を cssVarV2('icon/primary') に置き換える
const iconPrimaryColors = [
  // 旧式の "--affine-icon-color"
  'rgb(119,117,125)',
  // --affine-v2-icon-primary
  'rgb(122,122,122)',
];

// todo: secondary color と background color も置き換える必要があるかもしれない

const backgroundPrimaryColors = [
  // --affine-v2-background-primary
  'rgb(255,255,255)',
  '#ffffff',
];

const backgroundSecondaryColors = [
  // --affine-v2-background-secondary
  'rgb(245,245,245)',
];

globalStyle(
  `${root} :is(${iconPrimaryColors.map(color => `path[fill="${color}"]`).join(',')})`,
  {
    fill: 'currentColor',
  }
);

globalStyle(
  `${root} :is(${iconPrimaryColors.map(color => `path[stroke="${color}"]`).join(',')})`,
  {
    stroke: 'currentColor',
  }
);

globalStyle(
  `${root} :is(${backgroundPrimaryColors.map(color => `rect[fill="${color}"]`).join(',')})`,
  {
    fill: 'transparent',
  }
);

globalStyle(
  `${root} :is(${backgroundPrimaryColors.map(color => `path[fill="${color}"]`).join(',')})`,
  {
    fill: 'transparent',
  }
);

globalStyle(
  `${root} :is(${backgroundSecondaryColors.map(color => `path[fill="${color}"]`).join(',')})`,
  {
    fill: cssVarV2('layer/background/secondary'),
  }
);
