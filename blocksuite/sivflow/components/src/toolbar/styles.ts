import {
  type AffineCssVariables,
  combinedDarkCssVariables,
  combinedLightCssVariables,
} from '@toeverything/theme';
import { unsafeCSS } from 'lit';

const toolbarColorPairs: Array<readonly [string, keyof AffineCssVariables]> = [
  [
    '--sivflow-background-overlay-panel-color',
    '--affine-background-overlay-panel-color',
  ],
  [
    '--sivflow-v2-layer-background-overlayPanel',
    '--affine-v2-layer-background-overlayPanel' as never,
  ],
  [
    '--sivflow-v2-layer-insideBorder-blackBorder',
    '--affine-v2-layer-insideBorder-blackBorder' as never,
  ],
  ['--sivflow-v2-icon-primary', '--affine-v2-icon-primary' as never],
  ['--sivflow-background-error-color', '--affine-background-error-color'],
  ['--sivflow-background-primary-color', '--affine-background-primary-color'],
  ['--sivflow-background-tertiary-color', '--affine-background-tertiary-color'],
  ['--sivflow-icon-color', '--affine-icon-color'],
  ['--sivflow-icon-secondary', '--affine-icon-secondary'],
  ['--sivflow-border-color', '--affine-border-color'],
  ['--sivflow-divider-color', '--affine-divider-color'],
  ['--sivflow-text-primary-color', '--affine-text-primary-color'],
  ['--sivflow-hover-color', '--affine-hover-color'],
  ['--sivflow-hover-color-filled', '--affine-hover-color-filled'],
  ['--sivflow-menu-shadow', '--affine-menu-shadow'],
];

export const lightToolbarStyles = (selector: string) => `
  ${selector}[data-app-theme='light'] {
    ${toolbarColorPairs
      .map(
        ([targetKey, sourceKey]) =>
          `${targetKey}: ${unsafeCSS(combinedLightCssVariables[sourceKey])};`
      )
      .join('\n')}
  }
`;

export const darkToolbarStyles = (selector: string) => `
  ${selector}[data-app-theme='dark'] {
    ${toolbarColorPairs
      .map(
        ([targetKey, sourceKey]) =>
          `${targetKey}: ${unsafeCSS(combinedDarkCssVariables[sourceKey])};`
      )
      .join('\n')}
  }
`;
