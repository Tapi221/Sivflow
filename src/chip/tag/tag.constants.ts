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
const DEFAULT_TAG_COLOR_KEY = "gray";
const DEFAULT_TAG_COLOR_CLASS_NAME = `tag-color-${DEFAULT_TAG_COLOR_KEY}`;

export { DEFAULT_TAG_COLOR_CLASS_NAME, DEFAULT_TAG_COLOR_KEY, TAG_COLOR_KEYS };
