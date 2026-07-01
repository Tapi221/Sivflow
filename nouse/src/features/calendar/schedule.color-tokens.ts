import { SCHEDULE_EVENT_COLOR } from "@shared/design-tokens/color/Color.Schedule";
import { eventChipDesign } from "@web-renderer/chip/eventchip/eventChipDesign.generated";



type CalendarColorTokens = {
  bg: string;
  border: string;
  text: string;
};
type RgbColor = {
  red: number;
  green: number;
  blue: number;
};



const FALLBACK_ACCENT_COLOR = SCHEDULE_EVENT_COLOR.fallbackAccent;
const LIGHT_ACCENT_LUMINANCE_THRESHOLD = SCHEDULE_EVENT_COLOR.lightAccentLuminanceThreshold;
const LIGHT_ACCENT_BORDER_MIX_AMOUNT = SCHEDULE_EVENT_COLOR.lightAccentBorderMixAmount;
const colorTokensCache = new Map<string, CalendarColorTokens>();
const COLOR_MIX_TARGET: RgbColor = { ...SCHEDULE_EVENT_COLOR.textMixTarget };
const HEX_DIGITS = "0123456789abcdefABCDEF";



const clampChannel = (value: number) => Math.max(0, Math.min(255, value));
const toHexChannel = (value: number) =>
  clampChannel(Math.round(value)).toString(16).padStart(2, "0").toUpperCase();
const rgbToHex = ({ red, green, blue }: RgbColor) =>
  `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`;
const rgbToRgba = ({ red, green, blue }: RgbColor, alpha: number) =>
  `rgba(${clampChannel(Math.round(red))}, ${clampChannel(Math.round(green))}, ${clampChannel(Math.round(blue))}, ${alpha})`;
const isHexColorPart = (value: string): boolean => value.split("").every((character) => HEX_DIGITS.includes(character));
const normalizeHexColor = (hex: string): string | null => {
  const value = hex.trim().startsWith("#") ? hex.trim().slice(1) : hex.trim();

  if (value.length === 3 && isHexColorPart(value)) {
    return `#${value.split("").map((channel) => channel + channel).join("").toUpperCase()}`;
  }

  if (value.length === 6 && isHexColorPart(value)) {
    return `#${value.toUpperCase()}`;
  }

  return null;
};
const hexToRgb = (hex: string): RgbColor | null => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  return {
    red: Number.parseInt(normalized.slice(1, 3), 16),
    green: Number.parseInt(normalized.slice(3, 5), 16),
    blue: Number.parseInt(normalized.slice(5, 7), 16),
  };
};
const mixColors = (from: RgbColor, to: RgbColor, amount: number): RgbColor => ({
  red: from.red + (to.red - from.red) * amount,
  green: from.green + (to.green - from.green) * amount,
  blue: from.blue + (to.blue - from.blue) * amount,
});
const getRelativeLuminance = ({ red, green, blue }: RgbColor) => {
  const channels = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const generateColorTokens = (hex: string): CalendarColorTokens => {
  const cacheKey = `${normalizeHexColor(hex) ?? FALLBACK_ACCENT_COLOR}:${eventChipDesign.backgroundAlpha}`;
  const cachedTokens = colorTokensCache.get(cacheKey);

  if (cachedTokens) {
    return cachedTokens;
  }

  const base = hexToRgb(cacheKey.split(":")[0]) ?? hexToRgb(FALLBACK_ACCENT_COLOR);
  const accent = base ?? { red: 24, green: 95, blue: 165 };
  const luminance = getRelativeLuminance(accent);
  const isLightAccent = luminance > LIGHT_ACCENT_LUMINANCE_THRESHOLD;
  const border = isLightAccent
    ? rgbToHex(mixColors(accent, COLOR_MIX_TARGET, LIGHT_ACCENT_BORDER_MIX_AMOUNT))
    : cacheKey.split(":")[0];
  const textMixAmount = luminance > SCHEDULE_EVENT_COLOR.lightTextLuminanceThreshold ? SCHEDULE_EVENT_COLOR.lightTextMixAmount : SCHEDULE_EVENT_COLOR.darkTextMixAmount;
  const text = mixColors(accent, COLOR_MIX_TARGET, textMixAmount);

  const tokens = {
    bg: rgbToRgba(accent, eventChipDesign.backgroundAlpha),
    border,
    text: rgbToHex(text),
  };

  colorTokensCache.set(cacheKey, tokens);

  return tokens;
};



export { generateColorTokens };


export type { CalendarColorTokens };
