export type EventChipDesign = {
  backgroundAlpha: number;
  month: {
    heightPx: number;
    radiusPx: number;
    borderWidthPx: number;
    paddingLeftPx: number;
    paddingRightPx: number;
    paddingYWithTimePx: number;
    paddingYCompactPx: number;
    titleFontSizePx: number;
    timeFontSizePx: number;
    gapPx: number;
    allDayOffsetPx: number;
  };
  weekday: {
    radiusPx: number;
    borderWidthPx: number;
    paddingLeftPx: number;
    paddingRightPx: number;
    paddingYPx: number;
    inlinePaddingYPx: number;
    gapPx: number;
    titleFontSizePx: number;
    titleLineHeightPx: number;
    timeFontSizePx: number;
    timeLineHeightPx: number;
  };
  list: {
    rowHeightPx: number;
    chipHeightPx: number;
    allDayRowHeightPx: number;
    allDayChipHeightPx: number;
    radiusPx: number;
    borderWidthPx: number;
    titleFontSizePx: number;
    timeFontSizePx: number;
    titleGapPx: number;
  };
  tooltip: {
    monthRadiusPx: number;
    weekdayRadiusPx: number;
  };
};

export const eventChipDesign: EventChipDesign = {
  backgroundAlpha: 0.16,
  month: {
    heightPx: 18.3,
    radiusPx: 4,
    borderWidthPx: 3,
    paddingLeftPx: 3,
    paddingRightPx: 2,
    paddingYWithTimePx: 1,
    paddingYCompactPx: 2,
    titleFontSizePx: 11,
    timeFontSizePx: 9,
    gapPx: 3,
    allDayOffsetPx: 1,
  },
  weekday: {
    radiusPx: 6,
    borderWidthPx: 3,
    paddingLeftPx: 4,
    paddingRightPx: 1,
    paddingYPx: 2,
    inlinePaddingYPx: 1,
    gapPx: 0.5,
    titleFontSizePx: 12,
    titleLineHeightPx: 17,
    timeFontSizePx: 11,
    timeLineHeightPx: 16,
  },
  list: {
    rowHeightPx: 52,
    chipHeightPx: 46,
    allDayRowHeightPx: 34,
    allDayChipHeightPx: 28,
    radiusPx: 6,
    borderWidthPx: 3,
    titleFontSizePx: 11,
    timeFontSizePx: 11,
    titleGapPx: 0.5,
  },
  tooltip: {
    monthRadiusPx: 10,
    weekdayRadiusPx: 14,
  },
};
