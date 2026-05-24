const MONTH_EVENT_CHIP_HEIGHT_PX = 18.3;
const MONTH_EVENT_CHIP_GAP_PX = 3;
const MONTH_EVENT_OVERFLOW_TEXT_HEIGHT_PX = 11;
const MONTH_EVENT_BOTTOM_PADDING_PX = 0;
const MONTH_EVENT_CONTENT_TOP_PX = 32;

const getMonthEventChipCount = (contentHeight: number) => {
  if (contentHeight <= 0) return 0;

  return Math.max(
    0,
    Math.floor(
      (contentHeight + MONTH_EVENT_CHIP_GAP_PX) /
        (MONTH_EVENT_CHIP_HEIGHT_PX + MONTH_EVENT_CHIP_GAP_PX),
    ),
  );
};

export const getVisibleMonthEventChipCount = (
  eventCount: number,
  monthRowHeight: number,
) => {
  const contentHeight =
    monthRowHeight -
    MONTH_EVENT_CONTENT_TOP_PX -
    MONTH_EVENT_BOTTOM_PADDING_PX;

  const maxChipsWithoutOverflow = getMonthEventChipCount(contentHeight);

  if (eventCount <= maxChipsWithoutOverflow) return eventCount;

  const overflowReservedHeight =
    MONTH_EVENT_OVERFLOW_TEXT_HEIGHT_PX + MONTH_EVENT_CHIP_GAP_PX;

  return getMonthEventChipCount(contentHeight - overflowReservedHeight);
};
