import { useEffect } from "react";
import { INTERACTION_COLOR } from "@shared/design-tokens/color/Color.Interaction";
import { normalizeThemeAccentColor, useUserSettings } from "./useUserSettings";



type RgbColor = {
  red: number;
  green: number;
  blue: number;
};
type ThemeAccentRuntimeVariables = Record<string, string>;



const RGB_MAX_VALUE = 255;
const HSL_MAX_HUE = 360;
const HSL_PERCENT_SCALE = 100;
const PRIMARY_LIGHT_MIXES = {
  50: 0.96,
  100: 0.9,
  200: 0.78,
  300: 0.62,
  400: 0.36,
} as const;
const PRIMARY_DARK_MIXES = {
  600: 0.1,
  700: 0.24,
} as const;



const clampColorChannel = (value: number): number => Math.max(0, Math.min(RGB_MAX_VALUE, Math.round(value)));
const toHexChannel = (value: number): string => clampColorChannel(value).toString(16).padStart(2, "0");
const rgbToHexColor = ({ red, green, blue }: RgbColor): string => `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`;
const hexToRgbColor = (hexColor: string): RgbColor => ({
  red: Number.parseInt(hexColor.slice(1, 3), 16),
  green: Number.parseInt(hexColor.slice(3, 5), 16),
  blue: Number.parseInt(hexColor.slice(5, 7), 16),
});
const mixRgbColors = (base: RgbColor, target: RgbColor, targetRatio: number): RgbColor => ({
  red: base.red * (1 - targetRatio) + target.red * targetRatio,
  green: base.green * (1 - targetRatio) + target.green * targetRatio,
  blue: base.blue * (1 - targetRatio) + target.blue * targetRatio,
});
const rgbToCssValue = ({ red, green, blue }: RgbColor): string => `${clampColorChannel(red)} ${clampColorChannel(green)} ${clampColorChannel(blue)}`;
const toAlphaColor = (rgb: RgbColor, alpha: number): string => `rgb(${rgbToCssValue(rgb)} / ${alpha})`;
const rgbToHslCssValue = ({ red, green, blue }: RgbColor): string => {
  const normalizedRed = red / RGB_MAX_VALUE;
  const normalizedGreen = green / RGB_MAX_VALUE;
  const normalizedBlue = blue / RGB_MAX_VALUE;
  const max = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
  const min = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return `0 0% ${Math.round(lightness * HSL_PERCENT_SCALE)}%`;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue = max === normalizedRed
    ? ((normalizedGreen - normalizedBlue) / delta + (normalizedGreen < normalizedBlue ? 6 : 0)) / 6
    : max === normalizedGreen
      ? ((normalizedBlue - normalizedRed) / delta + 2) / 6
      : ((normalizedRed - normalizedGreen) / delta + 4) / 6;
  return `${Math.round(hue * HSL_MAX_HUE)} ${Math.round(saturation * HSL_PERCENT_SCALE)}% ${Math.round(lightness * HSL_PERCENT_SCALE)}%`;
};
const createThemeAccentRuntimeVariables = (color: string): ThemeAccentRuntimeVariables => {
  const accentRgb = hexToRgbColor(color);
  const whiteRgb: RgbColor = { red: RGB_MAX_VALUE, green: RGB_MAX_VALUE, blue: RGB_MAX_VALUE };
  const blackRgb: RgbColor = { red: 0, green: 0, blue: 0 };
  const primary50 = rgbToHexColor(mixRgbColors(accentRgb, whiteRgb, PRIMARY_LIGHT_MIXES[50]));
  const primary100 = rgbToHexColor(mixRgbColors(accentRgb, whiteRgb, PRIMARY_LIGHT_MIXES[100]));
  const primary200 = rgbToHexColor(mixRgbColors(accentRgb, whiteRgb, PRIMARY_LIGHT_MIXES[200]));
  const primary300 = rgbToHexColor(mixRgbColors(accentRgb, whiteRgb, PRIMARY_LIGHT_MIXES[300]));
  const primary400 = rgbToHexColor(mixRgbColors(accentRgb, whiteRgb, PRIMARY_LIGHT_MIXES[400]));
  const primary600 = rgbToHexColor(mixRgbColors(accentRgb, blackRgb, PRIMARY_DARK_MIXES[600]));
  const primary700 = rgbToHexColor(mixRgbColors(accentRgb, blackRgb, PRIMARY_DARK_MIXES[700]));
  return {
    "--theme-accent-color": color,
    "--theme-accent-rgb": rgbToCssValue(accentRgb),
    "--theme-accent-ring": rgbToHslCssValue(accentRgb),
    "--theme-accent-primary-50": primary50,
    "--theme-accent-primary-50-rgb": rgbToCssValue(hexToRgbColor(primary50)),
    "--theme-accent-primary-100": primary100,
    "--theme-accent-primary-100-rgb": rgbToCssValue(hexToRgbColor(primary100)),
    "--theme-accent-primary-200": primary200,
    "--theme-accent-primary-200-rgb": rgbToCssValue(hexToRgbColor(primary200)),
    "--theme-accent-primary-300": primary300,
    "--theme-accent-primary-300-rgb": rgbToCssValue(hexToRgbColor(primary300)),
    "--theme-accent-primary-400": primary400,
    "--theme-accent-primary-400-rgb": rgbToCssValue(hexToRgbColor(primary400)),
    "--theme-accent-primary-600": primary600,
    "--theme-accent-primary-600-rgb": rgbToCssValue(hexToRgbColor(primary600)),
    "--theme-accent-primary-700": primary700,
    "--theme-accent-primary-700-rgb": rgbToCssValue(hexToRgbColor(primary700)),
    "--interactive-accent-hover-bg": toAlphaColor(accentRgb, INTERACTION_COLOR.accentHoverAlpha),
    "--interactive-accent-pressed-bg": toAlphaColor(accentRgb, INTERACTION_COLOR.accentPressedAlpha),
    "--interactive-accent-selected-bg": toAlphaColor(accentRgb, INTERACTION_COLOR.accentSelectedAlpha),
    "--interactive-accent-outline": toAlphaColor(accentRgb, INTERACTION_COLOR.accentOutlineAlpha),
    "--primary-color": color,
  };
};
const useThemeAccentColor = () => {
  const { settings } = useUserSettings();
  const accentColor = normalizeThemeAccentColor(settings?.accentColor);
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const root = document.documentElement;
    const variables = createThemeAccentRuntimeVariables(accentColor);
    Object.entries(variables).forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });
    return () => {
      Object.keys(variables).forEach((name) => {
        root.style.removeProperty(name);
      });
    };
  }, [accentColor]);
};



export { useThemeAccentColor };
