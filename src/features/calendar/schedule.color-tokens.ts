import { eventChipDesign } from "@/chip/eventchip/eventChipDesign.generated";



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



const FALLBACK_ACCENT_COLOR = "#185FA5";
const LIGHT_ACCENT_LUMINANCE_THRESHOLD = 0.8;
const LIGHT_ACCENT_BORDER_MIX_AMOUNT = 0.28;
const colorTokensCache = new Map<string, CalendarColorTokens>();
const BLACK: RgbColor = { red: 0, green: 0, blue: 0 };



const clampChannel = (value: number) => Math.max(0, Math.min(255, value));
const toHexChannel = (value: number) =>
  clampChannel(Math.round(value)).toString(16).padStart(2, "0").toUpperCase();
const rgbToHex = ({ red, green, blue }: RgbColor) =>
  `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`;
const rgbToRgba = ({ red, green, blue }: RgbColor, alpha: number) =>
  `rgba(${clampChannel(Math.round(red))}, ${clampChannel(Math.round(green))}, ${clampChannel(Math.round(blue))}, ${alpha})`;
const normalizeHexColor = (hex: string): string | null => {
  const value = hex.trim();
  const shortMatch = /^#?([0-9a-fA-F]{3})$/.exec(value);

  if (shortMatch) {
    return `#${shortMatch[1]
      .split("")
      .map((channel) => channel + channel)
      .join("")
      .toUpperCase()}`;
  }

  const longMatch = /^#?([0-9a-fA-F]{6})$/.exec(value);
  return longMatch ? `#${longMatch[1].toUpperCase()}` : null;
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
    ? rgbToHex(mixColors(accent, BLACK, LIGHT_ACCENT_BORDER_MIX_AMOUNT))
    : cacheKey.split(":")[0];
  const textMixAmount = luminance > 0.55 ? 0.62 : 0.32;
  const text = mixColors(accent, BLACK, textMixAmount);

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
