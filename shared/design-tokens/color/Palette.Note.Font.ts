type PaletteNoteFontColorToken = {
  isBrightColor: boolean;
  name: string;
  value: string;
};
type PaletteNoteFontColorEntry = readonly [name: string, value: string, isBrightColor: boolean];



const PALETTE_NOTE_FONT_CUSTOM_COLOR_ENTRIES: PaletteNoteFontColorEntry[] = [
  ["dark orange 3", "#783f04", false],
  ["dark grey 3", "#666", false],
  ["dark grey 2", "#999", false],
  ["light cornflower blue 1", "#6c9eeb", false],
  ["dark magenta 3", "#4c1130", false],
];
const PALETTE_NOTE_FONT_COLOR_ENTRIES: PaletteNoteFontColorEntry[] = [
  ["black", "#000", false],
  ["dark grey 4", "#434343", false],
  ["dark grey 3", "#666", false],
  ["dark grey 2", "#999", false],
  ["dark grey 1", "#b7b7b7", false],
  ["grey", "#ccc", false],
  ["light grey 1", "#d9d9d9", false],
  ["light grey 2", "#efefef", true],
  ["light grey 3", "#f3f3f3", true],
  ["white", "#fff", true],
  ["red berry", "#980100", false],
  ["red", "#fe0000", false],
  ["orange", "#fe9900", false],
  ["yellow", "#feff00", true],
  ["green", "#0f0", false],
  ["cyan", "#0ff", false],
  ["cornflower blue", "#4b85e8", false],
  ["blue", "#1300ff", false],
  ["purple", "#90f", false],
  ["magenta", "#f0f", false],
  ["light red berry 3", "#e6b8af", true],
  ["light red 3", "#f4cccc", true],
  ["light orange 3", "#fce5cd", true],
  ["light yellow 3", "#fff2cc", true],
  ["light green 3", "#d9ead3", true],
  ["light cyan 3", "#d0e0e3", true],
  ["light cornflower blue 3", "#c9daf8", true],
  ["light blue 3", "#cfe2f3", true],
  ["light purple 3", "#d9d2e9", true],
  ["light magenta 3", "#ead1dc", true],
  ["light red berry 2", "#dd7e6b", true],
  ["light red 2", "#ea9999", true],
  ["light orange 2", "#f9cb9c", true],
  ["light yellow 2", "#ffe599", true],
  ["light green 2", "#b6d7a8", true],
  ["light cyan 2", "#a2c4c9", true],
  ["light cornflower blue 2", "#a4c2f4", true],
  ["light blue 2", "#9fc5e8", true],
  ["light purple 2", "#b4a7d6", true],
  ["light magenta 2", "#d5a6bd", true],
  ["light red berry 1", "#cc4125", false],
  ["light red 1", "#e06666", true],
  ["light orange 1", "#f6b26b", true],
  ["light yellow 1", "#ffd966", true],
  ["light green 1", "#93c47d", true],
  ["light cyan 1", "#76a5af", true],
  ["light cornflower blue 1", "#6d9eeb", true],
  ["light blue 1", "#6fa8dc", true],
  ["light purple 1", "#8e7cc3", true],
  ["light magenta 1", "#c27ba0", true],
  ["dark red berry 1", "#a61c00", false],
  ["dark red 1", "#c00", false],
  ["dark orange 1", "#e69138", true],
  ["dark yellow 1", "#f1c232", true],
  ["dark green 1", "#6aa84f", true],
  ["dark cyan 1", "#45818e", false],
  ["dark cornflower blue 1", "#3c78d8", false],
  ["dark blue 1", "#3d85c6", false],
  ["dark purple 1", "#674ea7", false],
  ["dark magenta 1", "#a64d79", false],
  ["dark red berry 2", "#85200c", false],
  ["dark red 2", "#900", false],
  ["dark orange 2", "#b45f06", false],
  ["dark yellow 2", "#bf9000", true],
  ["dark green 2", "#38761d", false],
  ["dark cyan 2", "#134f5c", false],
  ["dark cornflower blue 2", "#15c", false],
  ["dark blue 2", "#0b5394", false],
  ["dark purple 2", "#351c75", false],
  ["dark magenta 2", "#741b47", false],
  ["dark red berry 3", "#5b0f00", false],
  ["dark red 3", "#600", false],
  ["dark orange 3", "#783f04", false],
  ["dark yellow 3", "#7f6000", false],
  ["dark green 3", "#274e13", false],
  ["dark cyan 3", "#0c343d", false],
  ["dark cornflower blue 3", "#1c4587", false],
  ["dark blue 3", "#073763", false],
  ["dark purple 3", "#20124d", false],
  ["dark magenta 3", "#4c1130", false],
];
const PALETTE_NOTE_FONT_CUSTOM_COLORS: PaletteNoteFontColorToken[] = PALETTE_NOTE_FONT_CUSTOM_COLOR_ENTRIES.map(([name, value, isBrightColor]) => ({ isBrightColor, name, value }));
const PALETTE_NOTE_FONT_COLORS: PaletteNoteFontColorToken[] = PALETTE_NOTE_FONT_COLOR_ENTRIES.map(([name, value, isBrightColor]) => ({ isBrightColor, name, value }));



export { PALETTE_NOTE_FONT_COLORS, PALETTE_NOTE_FONT_CUSTOM_COLORS };


export type { PaletteNoteFontColorToken };
