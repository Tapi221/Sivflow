import { cn } from "@web-renderer/lib/utils";
import type { ReactNode, RefObject, UIEvent } from "react";
import type { CalendarWeekStartDay } from "@/features/calendar/calendar.types";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import { CalendarListView } from "@/features/calendar/list/CalendarListView.desktop";
import type { AppCalendarItem, CalendarAllDayEventOrderMap, CalendarAllDayEventReorderHandler, CalendarEventMoveHandler, CalendarGridStyle, CalendarViewMode, GoogleAccountDisplay } from "@/features/calendar/scheduleScreen.types";
import { CalendarTimetableView } from "@/features/calendar/timetable/CalendarTimetableView";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { CalendarPieChartView } from "./Calendar.PieChartView";



type CalendarSelectedViewsSplitViewProps = {
  selectedViewModes: readonly CalendarViewMode[];
  currentDate: Date;
  selectedDate: Date;
  weekStartDay: CalendarWeekStartDay;
  visibleDays: Date[];
  virtualRail?: ScheduleVirtualRail;
  events: GoogleCalendarEvent[];
  appProjects: AppCalendarItem[];
  googleAccounts: GoogleAccountDisplay[];
  headerScrollRef: RefObject<HTMLDivElement | null>;
  allDayScrollRef?: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  calendarGridStyle: CalendarGridStyle;
  allDayEventOrder?: CalendarAllDayEventOrderMap;
  onCalendarScroll?: (event: UIEvent<HTMLDivElement>) => void;
  onSelectDate?: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
  onVisibleDateChange?: (date: Date) => void;
  onMoveCalendarEvent?: CalendarEventMoveHandler;
  onReorderAllDayEvents?: CalendarAllDayEventReorderHandler;
  className?: string;
};
type CalendarSelectedViewPanelProps = CalendarSelectedViewsSplitViewProps & {
  viewMode: CalendarViewMode;
};



const SELECTED_VIEW_PANEL_CLASS_NAME = "calendar-selected-view-panel flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-slate-200 last:border-r-0";
const WEEKDAY_SURFACE_CLASS_NAME = "flex h-full min-h-0 flex-col overflow-hidden bg-white";



const getSelectedViewPanelVisibleDays = ({ viewMode, selectedDate, visibleDays }: Pick<CalendarSelectedViewPanelProps, "viewMode" | "selectedDate" | "visibleDays">): Date[] => {
  if (viewMode === "days") return [selectedDate];

  return visibleDays;
};
const renderSelectedViewPanelContent = ({ viewMode, currentDate, selectedDate, weekStartDay, visibleDays, virtualRail, events, appProjects, googleAccounts, headerScrollRef, allDayScrollRef, scrollContainerRef, calendarGridStyle, allDayEventOrder, onCalendarScroll, onSelectDate, onVisibleMonthChange, onVisibleDateChange, onMoveCalendarEvent, onReorderAllDayEvents }: CalendarSelectedViewPanelProps): ReactNode => {
  if (viewMode === "list") {
    return <CalendarListView days={visibleDays} virtualRail={virtualRail} events={events} selectedDate={selectedDate} onSelectDate={onSelectDate} onVisibleMonthChange={onVisibleMonthChange} scrollTargetDate={visibleDays[0] ?? selectedDate} className="h-full" />;
  }

  if (viewMode === "pieChart") {
    return <CalendarPieChartView days={visibleDays} virtualRail={virtualRail} selectedDate={selectedDate} events={events} appProjects={appProjects} googleAccounts={googleAccounts} onSelectDate={onSelectDate} onVisibleDateChange={onVisibleDateChange} className="h-full" />;
  }

  if (viewMode === "timetable") {
    return <CalendarTimetableView weekDate={currentDate} weekStartDay={weekStartDay} density="compact" className="h-full" />;
  }

  const panelVisibleDays = getSelectedViewPanelVisibleDays({ viewMode, selectedDate, visibleDays });

  return <div className={WEEKDAY_SURFACE_CLASS_NAME}><CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={panelVisibleDays} visibleEvents={events} calendarGridStyle={calendarGridStyle} allDayEventOrder={allDayEventOrder} onScroll={onCalendarScroll} selectedDate={selectedDate} onSelectDate={onSelectDate} onMoveCalendarEvent={onMoveCalendarEvent} onReorderAllDayEvents={onReorderAllDayEvents} /></div>;
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
