import {
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import type { UIEvent } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarViewMode } from "../calendarPane.types";

type CalendarBuffer = {
  before: number;
  after: number;
};

type Props = {
  activeMode: "timeline" | "calendar" | string;
  selectedViewMode: CalendarViewMode;

  visibleDays: Date[];

  timelineColumns: unknown[];
  timelineColumnWidth: number;
  timelineAnchorColumnIndex: number;

  calendarBuffer: CalendarBuffer;

  viewportWidth: number;
};

export const useCalendarScrollController = ({
  activeMode,
  selectedViewMode,
  visibleDays,
  timelineColumns,
  timelineColumnWidth,
  timelineAnchorColumnIndex,
  calendarBuffer,
  viewportWidth,
}: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollTriggerTokenRef = useRef(0);
  const lastSeenTokenRef = useRef(-1);

  const isExtendingLeftRef = useRef(false);
  const isExtendingRightRef = useRef(false);

  // ─────────────────────────────
  // scroll sync
  // ─────────────────────────────
  const handleTimelineScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const scroller = event.currentTarget;

      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = scroller.scrollLeft;
      }

      const distLeft = scroller.scrollLeft;
      const distRight =
        scroller.scrollWidth -
        scroller.clientWidth -
        scroller.scrollLeft;

      // 左端
      if (
        distLeft < C.TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingLeftRef.current
      ) {
        isExtendingLeftRef.current = true;
      }

      // 右端
      if (
        distRight < C.TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingRightRef.current
      ) {
        isExtendingRightRef.current = true;
      }
    },
    [],
  );

  // ─────────────────────────────
  // scroll positioning
  // ─────────────────────────────
  useLayoutEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    if (lastSeenTokenRef.current === scrollTriggerTokenRef.current) return;
    lastSeenTokenRef.current = scrollTriggerTokenRef.current;

    let nextScrollLeft = 0;

    if (activeMode === "timeline") {
      nextScrollLeft =
        timelineAnchorColumnIndex * timelineColumnWidth;
    } else {
      const anchorOffset = calendarBuffer.before * 80;

      const availableWidth = Math.max(
        0,
        viewportWidth - C.TIME_COLUMN_WIDTH,
      );

      const centerOffset = Math.max(
        0,
        (availableWidth - 80) / 2,
      );

      nextScrollLeft = Math.max(
        0,
        anchorOffset - centerOffset,
      );
    }

    scroller.scrollLeft = nextScrollLeft;

    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = nextScrollLeft;
    }
  }, [
    activeMode,
    calendarBuffer.before,
    timelineAnchorColumnIndex,
    timelineColumnWidth,
    viewportWidth,
  ]);

  return {
    scrollContainerRef,
    headerScrollRef,
    handleTimelineScroll,
  };
};