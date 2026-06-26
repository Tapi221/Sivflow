/* CSS variables. You need to handle all places where `CSS variables` are marked. */

import { LINE_COLORS } from '@blocksuite/affine-model';
import {
  type AffineCssVariables,
  type AffineTheme,
  combinedDarkCssVariables,
  combinedLightCssVariables,
  cssVar,
} from '@toeverything/theme';
export { cssVar } from '@toeverything/theme';
import { type AffineThemeKeyV2, cssVarV2 } from '@toeverything/theme/v2';
import { unsafeCSS } from 'lit';
export { cssVarV2 } from '@toeverything/theme/v2';

const AFFINE_CSS_VARIABLE_PREFIX = '--affine-';
const SIVFLOW_CSS_VARIABLE_PREFIX = '--sivflow-';

export const toAffineCssVariable = (property: string) => {
  return property.startsWith(SIVFLOW_CSS_VARIABLE_PREFIX)
    ? `${AFFINE_CSS_VARIABLE_PREFIX}${property.slice(
        SIVFLOW_CSS_VARIABLE_PREFIX.length
      )}`
    : property;
};

export const toSivflowCssVariable = (property: string) => {
  return property.startsWith(AFFINE_CSS_VARIABLE_PREFIX)
    ? `${SIVFLOW_CSS_VARIABLE_PREFIX}${property.slice(
        AFFINE_CSS_VARIABLE_PREFIX.length
      )}`
    : property;
};

export const installSivflowCssVariableAliases = () => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const rootStyle = root.style;
  const computedStyle = getComputedStyle(root);
  const variableKeys = new Set([
    ...Object.keys(combinedLightCssVariables),
    ...Object.keys(combinedDarkCssVariables),
  ]);

  for (const key of variableKeys) {
    if (!key.startsWith(AFFINE_CSS_VARIABLE_PREFIX)) continue;

    const sivflowKey = toSivflowCssVariable(key);
    if (computedStyle.getPropertyValue(sivflowKey).trim()) continue;

    rootStyle.setProperty(sivflowKey, `var(${key})`);
  }
};

export const ColorVariables = [
  '--sivflow-brand-color',
  '--sivflow-primary-color',
  '--sivflow-secondary-color',
  '--sivflow-tertiary-color',
  '--sivflow-hover-color',
  '--sivflow-icon-color',
  '--sivflow-icon-secondary',
  '--sivflow-border-color',
  '--sivflow-divider-color',
  '--sivflow-placeholder-color',
  '--sivflow-quote-color',
  '--sivflow-link-color',
  '--sivflow-edgeless-grid-color',
  '--sivflow-success-color',
  '--sivflow-warning-color',
  '--sivflow-error-color',
  '--sivflow-processing-color',
  '--sivflow-text-emphasis-color',
  '--sivflow-text-primary-color',
  '--sivflow-text-secondary-color',
  '--sivflow-text-disable-color',
  '--sivflow-black-10',
  '--sivflow-black-30',
  '--sivflow-black-50',
  '--sivflow-black-60',
  '--sivflow-black-80',
  '--sivflow-black-90',
  '--sivflow-black',
  '--sivflow-white-10',
  '--sivflow-white-30',
  '--sivflow-white-50',
  '--sivflow-white-60',
  '--sivflow-white-80',
  '--sivflow-white-90',
  '--sivflow-white',
  '--sivflow-background-code-block',
  '--sivflow-background-tertiary-color',
  '--sivflow-background-processing-color',
  '--sivflow-background-error-color',
  '--sivflow-background-warning-color',
  '--sivflow-background-success-color',
  '--sivflow-background-primary-color',
  '--sivflow-background-secondary-color',
  '--sivflow-background-modal-color',
  '--sivflow-background-overlay-panel-color',
  '--sivflow-tag-blue',
  '--sivflow-tag-green',
  '--sivflow-tag-teal',
  '--sivflow-tag-white',
  '--sivflow-tag-purple',
  '--sivflow-tag-red',
  '--sivflow-tag-pink',
  '--sivflow-tag-yellow',
  '--sivflow-tag-orange',
  '--sivflow-tag-gray',
  ...LINE_COLORS,
  '--sivflow-tooltip',
  '--sivflow-blue',
];

export const SizeVariables = [
  '--sivflow-font-h-1',
  '--sivflow-font-h-2',
  '--sivflow-font-h-3',
  '--sivflow-font-h-4',
  '--sivflow-font-h-5',
  '--sivflow-font-h-6',
  '--sivflow-font-base',
  '--sivflow-font-sm',
  '--sivflow-font-xs',
  '--sivflow-line-height',
  '--sivflow-z-index-modal',
  '--sivflow-z-index-popover',
];

export const FontFamilyVariables = [
  '--sivflow-font-family',
  '--sivflow-font-number-family',
  '--sivflow-font-code-family',
];

export const StyleVariables = [
  '--sivflow-editor-width',

  '--sivflow-theme-mode',
  '--sivflow-editor-mode',
  /* --sivflow-palette-transparent: special values added for the sake of logical consistency. */
  '--sivflow-palette-transparent',

  '--sivflow-popover-shadow',
  '--sivflow-menu-shadow',
  '--sivflow-float-button-shadow',
  '--sivflow-shadow-1',
  '--sivflow-shadow-2',
  '--sivflow-shadow-3',

  '--sivflow-paragraph-space',
  '--sivflow-popover-radius',
  '--sivflow-scale',
  ...SizeVariables,
  ...ColorVariables,
  ...FontFamilyVariables,
] as const;

type VariablesType = typeof StyleVariables;
export type CssVariableName = Extract<
  VariablesType[keyof VariablesType],
  string
>;
export type CssVariablesMap = Record<CssVariableName, string>;

export const unsafeCSSVar = (
  key: keyof AffineCssVariables | keyof AffineTheme,
  fallback?: string
) => unsafeCSS(cssVar(key, fallback));

export const unsafeCSSVarV2 = (key: AffineThemeKeyV2, fallback?: string) =>
  unsafeCSS(cssVarV2(key, fallback));
