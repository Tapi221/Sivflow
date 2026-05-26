import { AnimatedCircleCheckbox } from "@/chip/checkbox/AnimatedCircleCheckbox";
import { cn } from "@/lib/utils";

export const GOOGLE_SOURCE_ROW_CLASS_NAME =
  "flex h-7 w-full items-center gap-2 overflow-hidden rounded-[10px] px-2 pl-2 text-left";

const ASSERTIVE_SOURCE_CHECK_CLASS_NAME = "saturate-[0.68] brightness-[1.08]";
const ASSERTIVE_SOURCE_MIN_SATURATION = 0.45;
const ASSERTIVE_BLUE_HUE_MIN = 200;
const ASSERTIVE_BLUE_HUE_MAX = 230;
const ASSERTIVE_RED_HUE_MAX = 16;
const ASSERTIVE_RED_HUE_MIN = 344;

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

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

const getHueAndSaturation = ({ r, g, b }: RgbColor) => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (delta === 0) return { hue: 0, saturation: 0 };

  const lightness = (max + min) / 2;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;

  if (max === red) {
    hue = 60 * (((green - blue) / delta) % 6);
  } else if (max === green) {
    hue = 60 * ((blue - red) / delta + 2);
  } else {
    hue = 60 * ((red - green) / delta + 4);
  }

  return { hue: hue < 0 ? hue + 360 : hue, saturation };
};

const shouldMuteSourceCheckColor = (color: string): boolean => {
  const rgb = parseHexRgb(color);
  if (!rgb) return false;

  const { hue, saturation } = getHueAndSaturation(rgb);
  if (saturation < ASSERTIVE_SOURCE_MIN_SATURATION) return false;

  const isAssertiveBlue = hue >= ASSERTIVE_BLUE_HUE_MIN && hue <= ASSERTIVE_BLUE_HUE_MAX;
  const isAssertiveRed = hue <= ASSERTIVE_RED_HUE_MAX || hue >= ASSERTIVE_RED_HUE_MIN;

  return isAssertiveBlue || isAssertiveRed;
};

type SelectableGoogleSourceRowProps = {
  id: string;
  label: string;
  checked: boolean;
  color: string;
  onToggle: (id: string) => void;
};

export const SelectableGoogleSourceRow = ({
  id,
  label,
  checked,
  color,
  onToggle,
}: SelectableGoogleSourceRowProps) => {
  return (
    <button
      type="button"
      className={cn(
        GOOGLE_SOURCE_ROW_CLASS_NAME,
        "transition-all duration-150 hover:bg-[#f7f7f7] active:bg-[#f1f1f1]",
      )}
      onClick={() => onToggle(id)}
      aria-pressed={checked}
    >
      <AnimatedCircleCheckbox
        checked={checked}
        color={color}
        className={shouldMuteSourceCheckColor(color) ? ASSERTIVE_SOURCE_CHECK_CLASS_NAME : undefined}
      />

      <span className="truncate text-[12px] font-medium text-[#b8b8b8]">
        {label}
      </span>
    </button>
  );
};