import type { CSSProperties, RefObject, UIEvent } from "react";
import { Fragment, memo, useMemo } from "react";
import { CalendarDateButton, CalendarDateContent } from "@/chip/button/GridHeader.scheduletimeline";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { eventOverlapsRange } from "@/features/calendar/calendarEventRange";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { TimelineColumn, TimelineUnitBuffer, TimelineViewMode } from "./TimelineDayView.shared";
import { buildTimelineColumns, getTimelineColumnWidth } from "./TimelineDayView.shared";

const FALLBACK_LANE_COLOR = "#8f929c";
const EVENT_TOP_INSET_PX = 8;
const EVENT_HEIGHT_PX = 24;
const EVENT_GAP_PX = 4;
const EVENT_SIDE_INSET_PX = 6;
const MIN_EVENT_WIDTH_PX = 32;

type CalendarTimelineDayViewProps = {
  viewMode: TimelineViewMode;
  anchorDate: Date;
  timelineUnitBuffer: TimelineUnitBuffer;
  selectedDate: Date;
  dayColumnWidth: number;
  laneLabelWidth?: number;
  rowCount?: number;
  lanes?: TimelineLane[];
  visibleEvents?: GoogleCalendarEvent[];
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  onSelectDate?: (date: Date) => void;
};

export type TimelineLane = {
  id: string;
  label: string;
  color: string;
  checked: boolean;
  calendarIds?: string[];
  projectIds?: string[];
};

type TimelineEventPlacement = {
  event: GoogleCalendarEvent;
  laneId: string;
  left: number;
  width: number;
  stackIndex: number;
};

const normalizeProjectKey = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s\-_]+/g, "");

const getLaneMatchesEvent = (lane: TimelineLane, event: GoogleCalendarEvent): boolean => {
  const calendarIds = lane.calendarIds ?? [];
  const projectIds = lane.projectIds ?? [];
  const matchesCalendar = calendarIds.some((calendarId) =>
    event.calendarId === calendarId ||
    event.calendarId.endsWith(`:${calendarId}`) ||
    lane.id.endsWith(`:${event.calendarId}`),
  );

  if (matchesCalendar) return true;
  if (!event.projectId) return false;

  const eventProjectKey = normalizeProjectKey(event.projectId);
  const projectCandidates = [lane.id, lane.label, ...projectIds].map(normalizeProjectKey);

  return projectCandidates.includes(eventProjectKey);
};

const getColumnClippedEventPosition = (event: GoogleCalendarEvent, columns: TimelineColumn[], columnWidth: number) => {
  const firstColumnIndex = columns.findIndex((column) => eventOverlapsRange(event, column.start, column.end));

  if (firstColumnIndex < 0) return null;

  let lastColumnIndex = firstColumnIndex;

  for (let index = firstColumnIndex + 1; index < columns.length; index += 1) {
    if (eventOverlapsRange(event, columns[index].start, columns[index].end)) {
      lastColumnIndex = index;
    }
  }

  const left = firstColumnIndex * columnWidth;
  const width = Math.max(MIN_EVENT_WIDTH_PX, (lastColumnIndex - firstColumnIndex + 1) * columnWidth);

  return {
    left,
    width,
  };
};

const findStackIndex = (stackEnds: number[], start: number, end: number): number => {
  const availableIndex = stackEnds.findIndex((stackEnd) => stackEnd <= start);

  if (availableIndex >= 0) {
    stackEnds[availableIndex] = end;
    return availableIndex;
  }

  stackEnds.push(end);
  return stackEnds.length - 1;
};

const TimelineEventChip = ({ event }: { event: GoogleCalendarEvent }) => {
  const tokens = generateColorTokens(event.accentColor || FALLBACK_LANE_COLOR);

  return (
    <div
      className="flex h-full items-center gap-1 overflow-hidden rounded-md border-l-[3px] px-1.5 text-[11px] font-semibold leading-none"
      style={{ background: tokens.bg, borderLeftColor: tokens.border, color: tokens.text }}
      title={event.title || "Untitled"}
    >
      <span className="truncate">{event.title || "Untitled"}</span>
    </div>
  );
};

export const CalendarTimelineDayView = memo(function CalendarTimelineDayView({
  viewMode,
  anchorDate,
  timelineUnitBuffer,
  selectedDate,
  dayColumnWidth,
  laneLabelWidth = C.TIMELINE_DEFAULT_LANE_LABEL_WIDTH,
  rowCount = C.TIMELINE_DEFAULT_ROW_COUNT,
  lanes = [],
  visibleEvents = [],
  scrollContainerRef,
  onScroll,
  onSelectDate,
}: CalendarTimelineDayViewProps) {
  const columns = useMemo(() => {
    return buildTimelineColumns(viewMode, anchorDate, timelineUnitBuffer);
  }, [anchorDate, timelineUnitBuffer, viewMode]);

  const columnWidth = useMemo(() => {
    return getTimelineColumnWidth(viewMode, dayColumnWidth);
  }, [dayColumnWidth, viewMode]);

  const fallbackLaneCount = Math.max(rowCount, C.TIMELINE_DEFAULT_ROW_COUNT);
  const displayLanes = useMemo<TimelineLane[]>(() => {
    if (lanes.length > 0) {
      return lanes;
    }

    return Array.from({ length: fallbackLaneCount }, (_, index) => ({
      id: `timeline-placeholder-${index}`,
      label: "",
      color: FALLBACK_LANE_COLOR,
      checked: false,
    }));
  }, [fallbackLaneCount, lanes]);

  const selectedTime = selectedDate.getTime();
  const gridWidth = columns.length * columnWidth;
  const rangeStart = columns[0]?.start.getTime() ?? anchorDate.getTime();
  const rangeEnd = columns[columns.length - 1]?.end.getTime() ?? anchorDate.getTime();

  const scrollSurfaceStyle = useMemo<CSSProperties>(() => ({
    overscrollBehaviorX: "contain",
    willChange: "scroll-position",
  }), []);

  const columnGridStyle = useMemo<CSSProperties>(() => ({
    gridTemplateColumns: `repeat(${columns.length}, ${columnWidth}px)`,
    width: `${gridWidth}px`,
  }), [columnWidth, columns.length, gridWidth]);

  const timelineHeaderStyle = useMemo<CSSProperties>(() => ({
    ...columnGridStyle,
    height: `${C.TIMELINE_HEADER_HEIGHT}px`,
  }), [columnGridStyle]);

  const timelineRowStyle = useMemo<CSSProperties>(() => ({
    ...columnGridStyle,
    contain: "layout paint",
    height: `${C.TIMELINE_DEFAULT_ROW_HEIGHT}px`,
    transform: "translateZ(0)",
  }), [columnGridStyle]);

  const timelineEventPlacements = useMemo(() => {
    if (columns.length === 0 || gridWidth <= 0) return [];

    const laneStackEnds = new Map<string, number[]>();

    return visibleEvents
      .filter((event) => eventOverlapsRange(event, new Date(rangeStart), new Date(rangeEnd)))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      .flatMap((event): TimelineEventPlacement[] => {
        const matchedLane = displayLanes.find((lane) => lane.checked && getLaneMatchesEvent(lane, event));
        if (!matchedLane) return [];

        const start = new Date(event.startsAt).getTime();
        const end = Math.max(new Date(event.endsAt).getTime(), start + 1);
        const stackEnds = laneStackEnds.get(matchedLane.id) ?? [];
        const stackIndex = findStackIndex(stackEnds, start, end);
        laneStackEnds.set(matchedLane.id, stackEnds);
        const position = getColumnClippedEventPosition(event, columns, columnWidth);
        if (!position) return [];

        return [{
          event,
          laneId: matchedLane.id,
          left: position.left,
          width: position.width,
          stackIndex,
        }];
      });
  }, [columnWidth, columns, displayLanes, gridWidth, rangeEnd, rangeStart, visibleEvents]);

  const eventsByLaneId = useMemo(() => {
    const groupedEvents = new Map<string, TimelineEventPlacement[]>();

    timelineEventPlacements.forEach((placement) => {
      const events = groupedEvents.get(placement.laneId);

      if (events) {
        events.push(placement);
      } else {
        groupedEvents.set(placement.laneId, [placement]);
      }
    });

    return groupedEvents;
  }, [timelineEventPlacements]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-auto bg-white scrollbar-hidden"
        onScroll={onScroll}
        style={scrollSurfaceStyle}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${laneLabelWidth}px minmax(${gridWidth}px, max-content)`,
            minWidth: `${laneLabelWidth + gridWidth}px`,
          }}
        >
          <div className="sticky left-0 top-0 z-30 border-b border-r border-[#eeeeee] bg-white" />

          <div className="sticky top-0 z-20 border-b border-[#eeeeee] bg-white">
            <div className="grid" style={timelineHeaderStyle}>
              {columns.map((column) => {
                const isSelected = selectedTime >= column.start.getTime() && selectedTime <= column.end.getTime();

                return (
                  <CalendarDateButton
                    key={column.id}
                    isToday={column.isToday}
                    isSelected={isSelected}
                    onClick={() => onSelectDate?.(column.start)}
                    className="text-[12px] font-medium text-[#4c5361]"
                  >
                    {column.kind === "day" ? (
                      <CalendarDateContent
                        dateLabel={column.topLabel}
                        weekdayLabel={column.bottomLabel}
                        isToday={column.isToday}
                        isSelected={isSelected}
                        layout="date-weekday"
                      />
                    ) : column.kind === "week" ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-[#25272d]">
                        <span>{column.topLabel}</span>
                        <span className="text-[#8f929c]">~</span>
                        <span>{column.bottomLabel}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-baseline whitespace-nowrap font-semibold text-[#25272d]">
                        <span>{column.topLabel}</span>
                        <span>{column.bottomLabel}</span>
                      </span>
                    )}
                  </CalendarDateButton>
                );
              })}
            </div>
          </div>

          {displayLanes.map((lane) => {
            const laneEvents = eventsByLaneId.get(lane.id) ?? [];

            return (
              <Fragment key={lane.id}>
                <div className="sticky left-0 z-20 flex items-center gap-2 border-b border-r border-[#eeeeee] bg-white px-4" style={{ height: `${C.TIMELINE_DEFAULT_ROW_HEIGHT}px` }}>
                  {lane.label ? (
                    <>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.95)]" style={{ backgroundColor: lane.color }} />
                      <span className="min-w-0 truncate text-[12px] font-medium text-[#b8b8b8]">{lane.label}</span>
                    </>
                  ) : null}
                </div>

                <div className="relative grid border-b border-[#eeeeee] bg-white" style={timelineRowStyle}>
                  {columns.map((column) => (
                    <div key={column.id} className="border-r border-[#eeeeee] last:border-r-0" />
                  ))}

                  {laneEvents.map((placement) => (
                    <div
                      key={`${placement.event.id}-${placement.laneId}`}
                      className="absolute z-10"
                      style={{
                        left: placement.left + EVENT_SIDE_INSET_PX,
                        top: EVENT_TOP_INSET_PX + placement.stackIndex * (EVENT_HEIGHT_PX + EVENT_GAP_PX),
                        width: Math.max(MIN_EVENT_WIDTH_PX, placement.width - EVENT_SIDE_INSET_PX * 2),
                        height: EVENT_HEIGHT_PX,
                      }}
                    >
                      <TimelineEventChip event={placement.event} />
                    </div>
                  ))}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
});