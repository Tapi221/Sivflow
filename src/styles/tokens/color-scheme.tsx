const TAG_BACKGROUND_TEXT_ALPHA = 0.09;

const getTextColorDerivedBackgroundColor = (foregroundRgb: string) =>
  `rgb(${foregroundRgb} / ${TAG_BACKGROUND_TEXT_ALPHA})`;

export { getTextColorDerivedBackgroundColor };
