type TagColorKey = (typeof TAG_COLOR_KEYS)[number];
type TagColorPalette = {
  bg: string;
  bgRgb: readonly [number, number, number];
  fg: string;
  fgRgb: readonly [number, number, number];
  border: string;
  swatch: string;
};
type TagColorPaletteMap = Record<TagColorKey, TagColorPalette>;



const TAG_COLOR_KEYS = [
  "gray",
  "purple",
  "teal",
  "pink",
  "amber",
  "blue",
  "green",
  "red",
  "coral",
  "sky",
] as const;
const DEFAULT_TAG_COLOR_KEY: TagColorKey = "gray";
const TAG_COLOR_PALETTE = {
  gray: {
    bg: "#F1EFE8",
    bgRgb: [241, 239, 232],
    fg: "#444441",
    fgRgb: [68, 68, 65],
    border: "transparent",
    swatch: "#444441",
  },
  purple: {
    bg: "#EEEDFE",
    bgRgb: [238, 237, 254],
    fg: "#3C3489",
    fgRgb: [60, 52, 137],
    border: "transparent",
    swatch: "#3C3489",
  },
  teal: {
    bg: "#E1F5EE",
    bgRgb: [225, 245, 238],
    fg: "#085041",
    fgRgb: [8, 80, 65],
    border: "transparent",
    swatch: "#085041",
  },
  pink: {
    bg: "#FBEAF0",
    bgRgb: [251, 234, 240],
    fg: "#72243E",
    fgRgb: [114, 36, 62],
    border: "transparent",
    swatch: "#72243E",
  },
  amber: {
    bg: "#FAEEDA",
    bgRgb: [250, 238, 218],
    fg: "#633806",
    fgRgb: [99, 56, 6],
    border: "transparent",
    swatch: "#633806",
  },
  blue: {
    bg: "#E6F1FB",
    bgRgb: [230, 241, 251],
    fg: "#0C447C",
    fgRgb: [12, 68, 124],
    border: "transparent",
    swatch: "#0C447C",
  },
  green: {
    bg: "#EAF3DE",
    bgRgb: [234, 243, 222],
    fg: "#27500A",
    fgRgb: [39, 80, 10],
    border: "transparent",
    swatch: "#27500A",
  },
  red: {
    bg: "#FCEBEB",
    bgRgb: [252, 235, 235],
    fg: "#791F1F",
    fgRgb: [121, 31, 31],
    border: "transparent",
    swatch: "#791F1F",
  },
  coral: {
    bg: "#FAECE7",
    bgRgb: [250, 236, 231],
    fg: "#712B13",
    fgRgb: [113, 43, 19],
    border: "transparent",
    swatch: "#712B13",
  },
  sky: {
    bg: "#E1F4FA",
    bgRgb: [225, 244, 250],
    fg: "#0C4A6E",
    fgRgb: [12, 74, 110],
    border: "transparent",
    swatch: "#0C4A6E",
  },
} as const satisfies TagColorPaletteMap;



export { DEFAULT_TAG_COLOR_KEY, TAG_COLOR_KEYS, TAG_COLOR_PALETTE };


export type { TagColorKey, TagColorPalette, TagColorPaletteMap };
