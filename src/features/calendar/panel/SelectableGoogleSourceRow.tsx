import { AnimatedCircleCheckbox } from "@/chip/checkbox/AnimatedCircleCheckbox";
import { cn } from "@/lib/utils";

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

type HslColor = {
  hue: number;
  saturation: number;
  lightness: number;
};

type SelectableGoogleSourceRowProps = {
  id: string;
  label: string;
  checked: boolean;
  color: string;
  onToggle: (id: string) => void;
};

export const GOOGLE_SOURCE_ROW_CLASS_NAME =
  "flex h-7 w-full items-center gap-2 overflow-hidden rounded-[10px] px-2 pl-2 text-left";

const SOURCE_LABEL_CLASS_NAME = "truncate text-[12px] transition-colors duration-150";
const ASSERTIVE_SOURCE_CHECK_CLASS_NAME = "saturate-[0.86] brightness-[1.02]";
const ASSERTIVE_SOURCE_MIN_SATURATION = 0.45;
const ASSERTIVE_BLUE_HUE_MIN = 200;
const ASSERTIVE_BLUE_HUE_MAX = 230;
const ASSERTIVE_RED_HUE_MAX = 16;
const ASSERTIVE_RED_HUE_MIN = 344;
const SOURCE_COLOR_MIN_SATURATION = 0.38;
const SOURCE_COLOR_MAX_SATURATION = 0.78;
const SOURCE_COLOR_MAX_LIGHTNESS = 0.62;
const SOURCE_COLOR_MIN_LIGHTNESS = 0.38;
const SOURCE_COLOR_NEUTRAL_SATURATION_THRESHOLD = 0.08;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const parseHexRgb = (color: string): RgbColor | null => {
  const hex = color.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)) return null;

  const normalizedHex = hex.length === 3 ? hex.split("").map((channel) => `${channel}${channel}`).join("") : hex;

  return {
    r: parseInt(normalizedHex.slice(0, 2), 16),
    g: parseInt(normalizedHex.slice(2, 4), 16),
    b: parseInt(normalizedHex.slice(4, 6), 16),
  };
};

const toHexChannel = (value: number): string =>
  Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");

const toHexColor = ({ r, g, b }: RgbColor): string =>
  `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;

const getHslColor = ({ r, g, b }: RgbColor): HslColor => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) return { hue: 0, saturation: 0, lightness };

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;

  if (max === red) {
    hue = 60 * (((green - blue) / delta) % 6);
  } else if (max === green) {
    hue = 60 * ((blue - red) / delta + 2);
  } else {
    hue = 60 * ((red - green) / delta + 4);
  }

  return { hue: hue < 0 ? hue + 360 : hue, saturation, lightness };
};

const toRgbColor = ({ hue, saturation, lightness }: HslColor): RgbColor => {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = normalizedHue / 60;
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = lightness - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime < 1) {
    red = chroma;
    green = secondary;
  } else if (huePrime < 2) {
    red = secondary;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = secondary;
  } else if (huePrime < 4) {
    green = secondary;
    blue = chroma;
  } else if (huePrime < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return {
    r: (red + match) * 255,
    g: (green + match) * 255,
    b: (blue + match) * 255,
  };
};

const getReadableSourceColor = (color: string): string => {
  const rgb = parseHexRgb(color);
  if (!rgb) return color;

  const hsl = getHslColor(rgb);
  const saturation = hsl.saturation < SOURCE_COLOR_NEUTRAL_SATURATION_THRESHOLD
    ? hsl.saturation
    : clamp(
        Math.max(hsl.saturation + 0.08, SOURCE_COLOR_MIN_SATURATION),
        0,
        SOURCE_COLOR_MAX_SATURATION,
      );
  const lightnessOffset = hsl.lightness > 0.68 ? 0.1 : 0.06;
  const lightness = hsl.lightness > SOURCE_COLOR_MAX_LIGHTNESS
    ? clamp(hsl.lightness - lightnessOffset, SOURCE_COLOR_MIN_LIGHTNESS, SOURCE_COLOR_MAX_LIGHTNESS)
    : hsl.lightness;

  return toHexColor(toRgbColor({ ...hsl, saturation, lightness }));
};

const shouldMuteSourceCheckColor = (color: string): boolean => {
  const rgb = parseHexRgb(color);
  if (!rgb) return false;

  const { hue, saturation } = getHslColor(rgb);
  if (saturation < ASSERTIVE_SOURCE_MIN_SATURATION) return false;

  const isAssertiveBlue = hue >= ASSERTIVE_BLUE_HUE_MIN && hue <= ASSERTIVE_BLUE_HUE_MAX;
  const isAssertiveRed = hue <= ASSERTIVE_RED_HUE_MAX || hue >= ASSERTIVE_RED_HUE_MIN;

  return isAssertiveBlue || isAssertiveRed;
};

export const SelectableGoogleSourceRow = ({
  id,
  label,
  checked,
  color,
  onToggle,
}: SelectableGoogleSourceRowProps) => {
  const readableColor = getReadableSourceColor(color);

  return (
    <button
      type="button"
      className={cn(
        GOOGLE_SOURCE_ROW_CLASS_NAME,
        "group transition-all duration-150 hover:bg-[#f7f7f7] active:bg-[#f1f1f1]",
        checked && "bg-[#f8f9fb] hover:bg-[#f4f5f8]",
      )}
      onClick={() => onToggle(id)}
      aria-pressed={checked}
    >
      <AnimatedCircleCheckbox
        checked={checked}
        color={readableColor}
        className={shouldMuteSourceCheckColor(readableColor) ? ASSERTIVE_SOURCE_CHECK_CLASS_NAME : undefined}
      />

      <span
        className={cn(
          SOURCE_LABEL_CLASS_NAME,
          checked ? "font-semibold text-[#5f6574]" : "font-medium text-[#8a929f]",
          "group-hover:text-[#68707d]",
        )}
      >
        {label}
      </span>
    </button>
  );
};
