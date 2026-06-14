type EventChipDesign = {
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
  weekdayGrid: {
    timedOuterInsetPx: number;
    timedOverlapGapPx: number;
    timedVerticalTrimPx: number;
    timedMinHeightPx: number;
    allDayColumnInsetPx: number;
    allDayEventGapPx: number;
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



const eventChipDesign: EventChipDesign = {
  backgroundAlpha: 0.16,
  month: {
    heightPx: 20,
    radiusPx: 4,
    borderWidthPx: 4,
    paddingLeftPx: 4,
    paddingRightPx: 4,
    paddingYWithTimePx: 2,
    paddingYCompactPx: 2,
    titleFontSizePx: 12,
    timeFontSizePx: 12,
    gapPx: 4,
    allDayOffsetPx: 1,
  },
  weekday: {
    radiusPx: 6,
    borderWidthPx: 4,
    paddingLeftPx: 4,
    paddingRightPx: 1,
    paddingYPx: 2,
    inlinePaddingYPx: 1,
    gapPx: 1,
    titleFontSizePx: 12,
    titleLineHeightPx: 16,
    timeFontSizePx: 12,
    timeLineHeightPx: 16,
  },
  weekdayGrid: {
    timedOuterInsetPx: 1,
    timedOverlapGapPx: 2,
    timedVerticalTrimPx: 0,
    timedMinHeightPx: 24,
    allDayColumnInsetPx: 0,
    allDayEventGapPx: 1,
  },
  list: {
    rowHeightPx: 48,
    chipHeightPx: 44,
    allDayRowHeightPx: 32,
    allDayChipHeightPx: 28,
    radiusPx: 16,
    borderWidthPx: 4,
    titleFontSizePx: 12,
    timeFontSizePx: 12,
    titleGapPx: 2,
  },
  tooltip: {
    monthRadiusPx: 8,
    weekdayRadiusPx: 12,
  },
};



export { eventChipDesign };


export type { EventChipDesign };
