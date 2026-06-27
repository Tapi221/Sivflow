import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { CalendarTimetableColorKey, CalendarTimetableCourse, CalendarTimetableSlot, CalendarTimetableVisibleDayCount, CalendarTimetableWeekdayIndex } from "@core/domain/calendar/timetable/timetable.types";
import { getTagColorStyle } from "@web-renderer/chip/budge/tag/tagColor";
import { CalendarTimetableCourseEditorDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.CalendarTimetableCourseEditor";
import { CalendarTimetableSettingsDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.CalendarTimetableSettings";
import { ScheduleSyllabusCatalogDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.Schedule.SyllabusCatalog";
import { cn } from "@web-renderer/lib/utils";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import type { ComponentType, CSSProperties, SVGProps } from "react";
import * as stratisIcons from "stratis-ui-icons";
import type { CalendarWeekStartDay } from "@/features/calendar/calendar.types";
import { getCalendarWeekStartsOn } from "@/features/calendar/calendarWeekStart";
import { DEFAULT_CALENDAR_MONTH_WEEK_START_DAY } from "@/features/calendar/model/calendarMonth.model";
import { useCalendarTimetable } from "./useCalendarTimetable";



type TimetableSlot = {
  dayIndex: CalendarTimetableWeekdayIndex;
  periodId: string;
};
type CalendarTimetableDensity = "default" | "compact";
type CalendarTimetableViewProps = {
  weekDate: Date;
  weekStartDay?: CalendarWeekStartDay;
  density?: CalendarTimetableDensity;
  className?: string;
  addRequestToken?: number;
};
type CalendarTimetableGridStyle = CSSProperties & { "--calendar-timetable-day-count": CalendarTimetableVisibleDayCount; };
type StratisIconComponent = ComponentType<SVGProps<SVGSVGElement>>;



const STRATIS_ICON_COMPONENTS = stratisIcons as unknown as Record<string, StratisIconComponent | undefined>;
const STRATIS_PLUS_ICON_NAMES = ["StratisPlus01Icon", "StratisPlusIcon"] as const;
const STRATIS_SETTINGS_ICON_NAMES = ["StratisSettingsIcon", "StratisSettings01Icon", "StratisWrenchIcon"] as const;
const StratisPlusIcon = STRATIS_PLUS_ICON_NAMES.map((name) => STRATIS_ICON_COMPONENTS[name]).find((Icon): Icon is StratisIconComponent => Boolean(Icon)) ?? null;
const StratisSettingsIcon = STRATIS_SETTINGS_ICON_NAMES.map((name) => STRATIS_ICON_COMPONENTS[name]).find((Icon): Icon is StratisIconComponent => Boolean(Icon)) ?? null;
const TIMETABLE_GRID_TEMPLATE_COLUMNS = "56px repeat(var(--calendar-timetable-day-count), 112px)";
const TIMETABLE_COMPACT_GRID_TEMPLATE_COLUMNS = "34px repeat(var(--calendar-timetable-day-count), minmax(0, 1fr))";
const DEFAULT_TIMETABLE_ADD_REQUEST_TOKEN = 0;



const createTimetableSlotKey = ({ dayIndex, periodId }: TimetableSlot): string => `${dayIndex}:${periodId}`;
const buildTimetableWeekDays = (weekDate: Date, weekStartDay: CalendarWeekStartDay, visibleDayCount: CalendarTimetableVisibleDayCount): Date[] => Array.from({ length: visibleDayCount }, (_, index) => addDays(startOfWeek(weekDate, { weekStartsOn: getCalendarWeekStartsOn(weekStartDay) }), index));
const getTimetableEntryDayIndex = (date: Date): CalendarTimetableWeekdayIndex => ((date.getDay() + 6) % 7) as CalendarTimetableWeekdayIndex;
const createTimetableCourseSlotMap = (courses: CalendarTimetableCourse[]): Map<string, CalendarTimetableCourse> => {
  const map = new Map<string, CalendarTimetableCourse>();
  courses.forEach((course) => course.slots.forEach((slot) => map.set(createTimetableSlotKey(slot), course)));
  return map;
};
const formatTimetableWeekRange = (weekDays: Date[]): string => `${format(weekDays[0], "M/d", { locale: ja })} - ${format(weekDays[weekDays.length - 1], "M/d", { locale: ja })}`;
const getTimetableEntryStyle = (colorKey: CalendarTimetableColorKey) => getTagColorStyle(colorKey);
const getTimetableGridTemplateColumns = (density: CalendarTimetableDensity): string => density === "compact" ? TIMETABLE_COMPACT_GRID_TEMPLATE_COLUMNS : TIMETABLE_GRID_TEMPLATE_COLUMNS;
const createTimetableGridStyle = (density: CalendarTimetableDensity, visibleDayCount: CalendarTimetableVisibleDayCount): CalendarTimetableGridStyle => ({ gridTemplateColumns: getTimetableGridTemplateColumns(density), "--calendar-timetable-day-count": visibleDayCount });
const getTimetableCourseSecondaryText = (course: CalendarTimetableCourse): string => course.room.trim() === "" ? course.teacher : course.room;



const CalendarTimetableViewComponent = ({ weekDate, weekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY, density = "default", className, addRequestToken = DEFAULT_TIMETABLE_ADD_REQUEST_TOKEN }: CalendarTimetableViewProps) => {
  const today = new Date();
  const { courses, institutions, periods, settings, syllabusCourses, isLoading, saveCourse, deleteCourse, updateVisibleDayCount, addPeriod, updatePeriod, deletePeriod, saveSyllabusCourse, addCourseFromSyllabus, searchSyllabusCourses } = useCalendarTimetable();
  const visibleDayCount = settings?.visibleDayCount ?? 5;
  const activeSemesterId = settings?.activeSemesterId ?? "default-semester";
  const weekDays = useMemo(() => buildTimetableWeekDays(weekDate, weekStartDay, visibleDayCount), [visibleDayCount, weekDate, weekStartDay]);
  const weekRangeLabel = formatTimetableWeekRange(weekDays);
  const registeredCountLabel = `${courses.length}授業`;
  const isCompact = density === "compact";
  const timetableGridStyle = useMemo(() => createTimetableGridStyle(density, visibleDayCount), [density, visibleDayCount]);
  const courseSlotMap = useMemo(() => createTimetableCourseSlotMap(courses), [courses]);
  const [editingCourse, setEditingCourse] = useState<CalendarTimetableCourse | null>(null);
  const [editingSlot, setEditingSlot] = useState<CalendarTimetableSlot | null>(null);
  const [isCourseEditorOpen, setIsCourseEditorOpen] = useState(false);
  const [handledAddRequestToken, setHandledAddRequestToken] = useState(addRequestToken);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyllabusCatalogOpen, setIsSyllabusCatalogOpen] = useState(false);
  const handleOpenCourseEditor = useCallback((course: CalendarTimetableCourse | null, slot: CalendarTimetableSlot) => {
    setEditingCourse(course);
    setEditingSlot(slot);
    setIsCourseEditorOpen(true);
  }, []);
  const handleOpenBlankCourseEditor = useCallback(() => {
    setEditingCourse(null);
    setEditingSlot(null);
    setIsCourseEditorOpen(true);
  }, []);
  const handleCloseCourseEditor = useCallback(() => {
    setIsCourseEditorOpen(false);
    setEditingCourse(null);
    setEditingSlot(null);
  }, []);
  const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);
  const handleOpenSyllabusCatalog = useCallback(() => setIsSyllabusCatalogOpen(true), []);
  const handleCloseSyllabusCatalog = useCallback(() => setIsSyllabusCatalogOpen(false), []);
  useEffect(() => {
    if (addRequestToken === handledAddRequestToken) return;
    setHandledAddRequestToken(addRequestToken);
    handleOpenBlankCourseEditor();
  }, [addRequestToken, handleOpenBlankCourseEditor, handledAddRequestToken]);
  return (
    <div className={cn("flex h-full min-h-0 min-w-0 flex-col bg-white text-zinc-900", className)}>
      <div className={cn("flex shrink-0 flex-wrap items-center justify-between gap-3 pb-3 pt-1", isCompact ? "px-4" : "px-5")}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={cn("rounded-full border border-slate-200 bg-zinc-50 font-semibold tabular-nums text-zinc-500", isCompact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs")}>{weekRangeLabel}</span>
          <span className={cn("rounded-full border border-slate-200 bg-white font-semibold text-slate-500", isCompact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs")}>{visibleDayCount}日 / {periods.length}限</span>
          <span className={cn("rounded-full border border-slate-200 bg-white font-semibold text-slate-500", isCompact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs")}>{isLoading ? "読み込み中" : `${registeredCountLabel}登録済み`}</span>
          <span className={cn("rounded-full border border-slate-200 bg-white font-semibold text-slate-500", isCompact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs")}>シラバス {syllabusCourses.length}件</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className={cn("rounded-full border border-zinc-200 bg-white font-bold text-blue-500 shadow-sm hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500", isCompact ? "h-8 px-3 text-xs" : "h-9 px-4 text-xs")} onClick={handleOpenSyllabusCatalog}>シラバス</button>
          <button type="button" aria-label="時間割設定" className={cn("flex items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500", isCompact ? "h-8 w-8" : "h-9 w-9")} onClick={handleOpenSettings}>{StratisSettingsIcon ? <StratisSettingsIcon className={cn(isCompact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden="true" focusable="false" /> : null}</button>
        </div>
      </div>
      <div className={cn("min-h-0 flex-1 text-center scrollbar-hidden", isCompact ? "overflow-y-auto overflow-x-hidden px-4 pb-3" : "overflow-auto px-5 pb-5")}>
        <div className={cn("gap-y-2 text-left", isCompact ? "grid w-full min-w-0 gap-x-1" : "inline-grid w-max gap-x-2")} style={timetableGridStyle}>
          <div aria-hidden="true" className={isCompact ? "h-7" : "h-8"} />
          {weekDays.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={day.toISOString()} className={cn("flex min-w-0 items-center justify-center text-center", isCompact ? "h-7 gap-1" : "h-8 gap-1.5")}>
                <span className={cn("font-bold tracking-tight", isCompact ? "text-xs" : "text-xs", isToday ? "text-blue-500" : "text-zinc-900")}>{format(day, "E", { locale: ja })}</span>
                <span className={cn("rounded-full font-semibold tabular-nums", isCompact ? "px-1 py-0.5 text-xs" : "px-1.5 py-0.5 text-xs", isToday ? "bg-blue-50 text-blue-500" : "bg-zinc-50 text-slate-500")}>{format(day, "M/d", { locale: ja })}</span>
              </div>
            );
          })}
          {periods.map((period) => (
            <div key={period.id} className="contents">
              <div className={cn("flex items-center justify-end pr-1", isCompact ? "min-h-12" : "min-h-12")}>
                <div className={cn("flex items-center justify-end text-right", isCompact ? "gap-1" : "gap-2")}>
                  <div className={cn("font-bold leading-none tracking-tighter text-neutral-950", isCompact ? "text-lg" : "text-xl")}>{period.label}</div>
                  <div className={cn("flex flex-col items-center font-medium leading-none tabular-nums text-slate-500", isCompact ? "text-xs" : "text-xs")}><span>{period.startTime}</span><span aria-hidden="true" className="my-0.5 h-2 w-px bg-slate-300" /><span>{period.endTime}</span></div>
                </div>
              </div>
              {weekDays.map((day) => {
                const slot = { dayIndex: getTimetableEntryDayIndex(day), periodId: period.id };
                const entry = courseSlotMap.get(createTimetableSlotKey(slot)) ?? null;
                return (
                  <button key={`${day.toISOString()}-${period.id}`} type="button" aria-label={`${format(day, "M月d日 EEEE", { locale: ja })} ${period.label}限`} className={cn("relative min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500", isCompact ? "min-h-12 rounded-2xl" : "min-h-12 rounded-2xl", entry ? (isCompact ? "border px-1.5 py-1" : "border px-2.5 py-1") : "border border-dashed border-slate-300 bg-white/60 text-zinc-400 hover:border-zinc-300 hover:bg-slate-50")} style={entry ? getTimetableEntryStyle(entry.colorKey) : undefined} onClick={() => handleOpenCourseEditor(entry, slot)}>
                    {entry ? <span className={cn("flex h-full flex-col items-center justify-center text-center", isCompact ? "min-h-9" : "min-h-10")}><span className={cn("max-w-full truncate font-semibold leading-snug tracking-tight text-inherit", isCompact ? "text-xs" : "text-xs")}>{entry.title}</span><span className={cn("mt-0.5 max-w-full truncate font-semibold leading-snug opacity-80", isCompact ? "text-xs" : "text-xs")}>{getTimetableCourseSecondaryText(entry)}</span>{entry.memo ? <span className={cn("mt-0.5 max-w-full truncate font-semibold leading-snug opacity-60", isCompact ? "text-xs" : "text-xs")}>{entry.memo}</span> : null}</span> : <span className="flex h-full items-center justify-center text-center">{StratisPlusIcon ? <StratisPlusIcon className="h-5 w-5" aria-hidden="true" focusable="false" /> : null}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {isCourseEditorOpen ? <CalendarTimetableCourseEditorDialog course={editingCourse} semesterId={activeSemesterId} initialSlot={editingSlot} periods={periods} visibleDayCount={visibleDayCount} onSave={saveCourse} onDelete={deleteCourse} onClose={handleCloseCourseEditor} /> : null}
      {isSettingsOpen ? <CalendarTimetableSettingsDialog periods={periods} visibleDayCount={visibleDayCount} onChangeVisibleDayCount={updateVisibleDayCount} onAddPeriod={addPeriod} onUpdatePeriod={updatePeriod} onDeletePeriod={deletePeriod} onClose={handleCloseSettings} /> : null}
      {isSyllabusCatalogOpen ? <ScheduleSyllabusCatalogDialog activeSemesterId={activeSemesterId} institutions={institutions} periods={periods} syllabusCourses={syllabusCourses} onSearch={searchSyllabusCourses} onSaveSyllabusCourse={saveSyllabusCourse} onAddCourseFromSyllabus={addCourseFromSyllabus} onClose={handleCloseSyllabusCatalog} /> : null}
    </div>
  );
};



const CalendarTimetableView = memo(CalendarTimetableViewComponent);
CalendarTimetableView.displayName = "CalendarTimetableView";

export { CalendarTimetableView };
