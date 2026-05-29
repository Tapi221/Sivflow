import type { ReactNode, RefObject, UIEvent } from "react";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import { CalendarListView } from "@/features/calendar/list/CalendarListView.desktop";
import type { CalendarGridStyle, CalendarViewMode, GoogleAccountDisplay, AppCalendarItem } from "@/features/calendar/scheduleScreen.types";
import { CalendarTimetableView } from "@/features/calendar/timetable/CalendarTimetableView";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import { CalendarPieChartView } from "./Calendar.PieChartView";

type CalendarSelectedViewsSplitViewProps = {
  selectedViewModes: readonly CalendarViewMode[];
  currentDate: Date;
  selectedDate: Date;
  visibleDays: Date[];
  virtualRail?: ScheduleVirtualRail;
  events: GoogleCalendarEvent[];
  appProjects: AppCalendarItem[];
  googleAccounts: GoogleAccountDisplay[];
  headerScrollRef: RefObject<HTMLDivElement | null>;
  allDayScrollRef?: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  calendarDayColumnWidth: number;
  calendarGridStyle: CalendarGridStyle;
  onCalendarScroll?: (event: UIEvent<HTMLDivElement>) => void;
  onSelectDate?: (date: Date) => void;
  onReachStart?: () => void;
  onReachEnd?: () => void;
  onVisibleMonthChange?: (date: Date) => void;
  onVisibleDateChange?: (date: Date) => void;
  className?: string;
};

type CalendarSelectedViewPanelProps = CalendarSelectedViewsSplitViewProps & {
  viewMode: CalendarViewMode;
};

const SELECTED_VIEW_PANEL_CLASS_NAME = "min-h-0 min-w-0 overflow-hidden border-r border-[#eeeeee] last:border-r-0";
const WEEKDAY_SURFACE_CLASS_NAME = "flex h-full min-h-0 flex-col overflow-hidden bg-white";

const renderSelectedViewPanelContent = ({ viewMode, currentDate, selectedDate, visibleDays, virtualRail, events, appProjects, googleAccounts, headerScrollRef, allDayScrollRef, scrollContainerRef, calendarDayColumnWidth, calendarGridStyle, onCalendarScroll, onSelectDate, onReachStart, onReachEnd, onVisibleMonthChange, onVisibleDateChange }: CalendarSelectedViewPanelProps): ReactNode => {
  if (viewMode === "list") {
    return <CalendarListView days={visibleDays} virtualRail={virtualRail} events={events} selectedDate={selectedDate} onSelectDate={onSelectDate} onReachStart={onReachStart} onReachEnd={onReachEnd} onVisibleMonthChange={onVisibleMonthChange} />;
  }

  if (viewMode === "pieChart") {
    return <CalendarPieChartView days={visibleDays} virtualRail={virtualRail} selectedDate={selectedDate} events={events} appProjects={appProjects} googleAccounts={googleAccounts} onSelectDate={onSelectDate} onReachStart={onReachStart} onReachEnd={onReachEnd} onVisibleDateChange={onVisibleDateChange} />;
  }

  if (viewMode === "timetable") {
    return <CalendarTimetableView weekDate={currentDate} />;
  }

  return <div className={WEEKDAY_SURFACE_CLASS_NAME}><CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={visibleDays} virtualRail={virtualRail} visibleEvents={events} calendarDayColumnWidth={calendarDayColumnWidth} _calendarDayColumnWidth={calendarDayColumnWidth} calendarGridStyle={calendarGridStyle} onScroll={onCalendarScroll} selectedDate={selectedDate} onSelectDate={onSelectDate} /></div>;
};

const CalendarSelectedViewPanel = (props: CalendarSelectedViewPanelProps) => (
  <div className={SELECTED_VIEW_PANEL_CLASS_NAME}>
    {renderSelectedViewPanelContent(props)}
  </div>
);

const CalendarSelectedViewsSplitView = ({ selectedViewModes, className, ...props }: CalendarSelectedViewsSplitViewProps) => {
  const displayedViewModes = selectedViewModes.slice(0, 2);

  return (
    <div className={cn("ml-4 mr-4 grid min-h-0 flex-1 grid-cols-2 overflow-hidden bg-white", className)}>
      {displayedViewModes.map((viewMode) => <CalendarSelectedViewPanel key={viewMode} selectedViewModes={displayedViewModes} viewMode={viewMode} className={className} {...props} />)}
    </div>
  );
};

export { CalendarSelectedViewsSplitView };