import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { CalendarTimetableColorKey, CalendarTimetableCourse, CalendarTimetableCourseDraft, CalendarTimetablePeriod, CalendarTimetableSlot, CalendarTimetableVisibleDayCount, CalendarTimetableWeekdayIndex } from "@core/domain/calendar/timetable/timetable.types";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import type { ComponentType, CSSProperties, SVGProps } from "react";
import * as stratisIcons from "stratis-ui-icons";
import { TAG_COLOR_KEYS } from "@/chip/tag/tag.constants";
import { getTagColorStyle } from "@/chip/tag/tag.style";
import type { CalendarWeekStartDay } from "@/features/calendar/calendar.types";
import { getCalendarWeekStartsOn } from "@/features/calendar/calendarWeekStart";
import { DEFAULT_CALENDAR_MONTH_WEEK_START_DAY } from "@/features/calendar/model/calendarMonth.model";
import { cn } from "@/lib/utils";
import { normalizeVisibleDayCount } from "./calendarTimetable.storage";
import { CalendarTimetableSyllabusCatalogPanel } from "./CalendarTimetableSyllabusCatalogPanel";
import { useCalendarTimetable } from "./useCalendarTimetable";

type TimetableSlot = { dayIndex: CalendarTimetableWeekdayIndex; periodId: string; };

type CalendarTimetableDensity = "default" | "compact";

type CalendarTimetableViewProps = { weekDate: Date; weekStartDay?: CalendarWeekStartDay; density?: CalendarTimetableDensity; className?: string; addRequestToken?: number; };

type CalendarTimetableCourseEditorProps = { course: CalendarTimetableCourse | null; semesterId: string; initialSlot: CalendarTimetableSlot | null; periods: CalendarTimetablePeriod[]; visibleDayCount: CalendarTimetableVisibleDayCount; onSave: (draft: CalendarTimetableCourseDraft) => Promise<void>; onDelete: (courseId: string) => Promise<void>; onClose: () => void; };

type CalendarTimetableSettingsPanelProps = { periods: CalendarTimetablePeriod[]; visibleDayCount: CalendarTimetableVisibleDayCount; onChangeVisibleDayCount: (visibleDayCount: CalendarTimetableVisibleDayCount) => Promise<void>; onAddPeriod: () => Promise<void>; onUpdatePeriod: (period: CalendarTimetablePeriod) => Promise<void>; onDeletePeriod: (periodId: string) => Promise<void>; onClose: () => void; };

type CalendarTimetableGridStyle = CSSProperties & { "--calendar-timetable-day-count": CalendarTimetableVisibleDayCount; };

type StratisIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const STRATIS_ICON_COMPONENTS = stratisIcons as Record<string, StratisIconComponent | undefined>;

const STRATIS_CHECK_ICON_NAMES = ["StratisCheckIcon", "StratisCheck01Icon", "StratisCheckCircleContainedIcon"] as const;

const STRATIS_PLUS_ICON_NAMES = ["StratisPlus01Icon", "StratisPlusIcon"] as const;

const STRATIS_SETTINGS_ICON_NAMES = ["StratisSettingsIcon", "StratisSettings01Icon", "StratisWrenchIcon"] as const;

const TIMETABLE_GRID_TEMPLATE_COLUMNS = "56px repeat(var(--calendar-timetable-day-count), 112px)";

const TIMETABLE_COMPACT_GRID_TEMPLATE_COLUMNS = "34px repeat(var(--calendar-timetable-day-count), minmax(0, 1fr))";

const TIMETABLE_DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;

const DEFAULT_COURSE_COLOR_KEY: CalendarTimetableColorKey = "blue";

const DEFAULT_TIMETABLE_ADD_REQUEST_TOKEN = 0;

const EMPTY_SLOT_LIST: CalendarTimetableSlot[] = [];

const StratisCheckIcon = resolveStratisIcon(STRATIS_CHECK_ICON_NAMES);

const StratisPlusIcon = resolveStratisIcon(STRATIS_PLUS_ICON_NAMES);

const StratisSettingsIcon = resolveStratisIcon(STRATIS_SETTINGS_ICON_NAMES);

const StratisCheckIcon = resolveStratisIcon(STRATIS_CHECK_ICON_NAMES);

const StratisPlusIcon = resolveStratisIcon(STRATIS_PLUS_ICON_NAMES);

const StratisSettingsIcon = resolveStratisIcon(STRATIS_SETTINGS_ICON_NAMES);

const StratisCheckIcon = resolveStratisIcon(STRATIS_CHECK_ICON_NAMES);

const StratisPlusIcon = resolveStratisIcon(STRATIS_PLUS_ICON_NAMES);

const StratisSettingsIcon = resolveStratisIcon(STRATIS_SETTINGS_ICON_NAMES);

const resolveStratisIcon = (names: readonly string[]): StratisIconComponent | null => names.map((name) => STRATIS_ICON_COMPONENTS[name]).find((Icon): Icon is StratisIconComponent => Boolean(Icon)) ?? null;
const StratisCheckIcon = resolveStratisIcon(STRATIS_CHECK_ICON_NAMES);
const StratisPlusIcon = resolveStratisIcon(STRATIS_PLUS_ICON_NAMES);
const StratisSettingsIcon = resolveStratisIcon(STRATIS_SETTINGS_ICON_NAMES);

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

const isSameTimetableSlot = (left: CalendarTimetableSlot, right: CalendarTimetableSlot): boolean => left.dayIndex === right.dayIndex && left.periodId === right.periodId;

const createEditorSlots = (course: CalendarTimetableCourse | null, initialSlot: CalendarTimetableSlot | null): CalendarTimetableSlot[] => course?.slots ?? (initialSlot ? [initialSlot] : EMPTY_SLOT_LIST);

const CalendarTimetableSettingsPanel = ({ periods, visibleDayCount, onChangeVisibleDayCount, onAddPeriod, onUpdatePeriod, onDeletePeriod, onClose }: CalendarTimetableSettingsPanelProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-6" role="dialog" aria-modal="true" aria-label="時間割設定">
      <div className="flex max-h-full w-full max-w-[520px] flex-col overflow-hidden rounded-[22px] border border-[#e5e5ea] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f2] px-5 py-4">
          <>
            <h2 className="text-[17px] font-bold tracking-[-0.03em] text-[#1c1c1e]">時間割設定</h2>
            <p className="mt-1 text-[12px] font-medium text-[#8e8e93]">曜日数と時限テンプレートを編集</p>
          </>
          <button type="button" className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#6e6e73] hover:bg-[#f7f7f8]" onClick={onClose}>閉じる</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-5">
            <label className="mb-2 block text-[12px] font-bold text-[#6e6e73]">表示曜日</label>
            <div className="flex gap-2">
              {[5, 6, 7].map((count) => {
                const visibleCount = normalizeVisibleDayCount(count);
                return <button key={count} type="button" className={cn("rounded-full border px-3 py-1.5 text-[13px] font-semibold", visibleDayCount === visibleCount ? "border-[#007aff] bg-[#e8f2ff] text-[#007aff]" : "border-[#e5e5ea] bg-white text-[#6e6e73]")} onClick={() => {
                  void onChangeVisibleDayCount(visibleCount); }}
                >{count}日</button>;
              })}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-[#6e6e73]">時限</label>
              <button type="button" className="rounded-full border border-[#e5e5ea] px-3 py-1.5 text-[12px] font-bold text-[#007aff]" onClick={() => {
                void onAddPeriod(); }}
              >時限を追加</button>
            </div>
            {periods.map((period) => (
              <div key={period.id} className="grid grid-cols-[52px_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] border border-[#eee] bg-[#fafafa] p-2">
                <input className="h-9 rounded-[10px] border border-[#e5e5ea] bg-white px-2 text-center text-[13px] font-bold text-[#1c1c1e]" value={period.label} onChange={(event) => {
                  void onUpdatePeriod({ ...period, label: event.target.value }); }} aria-label="時限名"
                />
                <input className="h-9 rounded-[10px] border border-[#e5e5ea] bg-white px-2 text-[13px] font-semibold text-[#1c1c1e]" type="time" value={period.startTime} onChange={(event) => {
                  void onUpdatePeriod({ ...period, startTime: event.target.value }); }} aria-label={`${period.label}限の開始時刻`}
                />
                <input className="h-9 rounded-[10px] border border-[#e5e5ea] bg-white px-2 text-[13px] font-semibold text-[#1c1c1e]" type="time" value={period.endTime} onChange={(event) => {
                  void onUpdatePeriod({ ...period, endTime: event.target.value }); }} aria-label={`${period.label}限の終了時刻`}
                />
                <button type="button" className="h-9 rounded-full px-2 text-[12px] font-bold text-[#ff3b30] disabled:text-[#c7c7cc]" disabled={periods.length <= 1} onClick={() => {
                  void onDeletePeriod(period.id); }}
                >削除</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CalendarTimetableCourseEditor = ({ course, semesterId, initialSlot, periods, visibleDayCount, onSave, onDelete, onClose }: CalendarTimetableCourseEditorProps) => {
  const [title, setTitle] = useState(course?.title ?? "");
  const [room, setRoom] = useState(course?.room ?? "");
  const [teacher, setTeacher] = useState(course?.teacher ?? "");
  const [memo, setMemo] = useState(course?.memo ?? "");
  const [colorKey, setColorKey] = useState<CalendarTimetableColorKey>(course?.colorKey ?? DEFAULT_COURSE_COLOR_KEY);
  const [slots, setSlots] = useState<CalendarTimetableSlot[]>(() => createEditorSlots(course, initialSlot));

  useEffect(() => {
    setTitle(course?.title ?? "");
    setRoom(course?.room ?? "");
    setTeacher(course?.teacher ?? "");
    setMemo(course?.memo ?? "");
    setColorKey(course?.colorKey ?? DEFAULT_COURSE_COLOR_KEY);
    setSlots(createEditorSlots(course, initialSlot));
  }, [course, initialSlot]);

  const toggleSlot = useCallback((slot: CalendarTimetableSlot) => {
    setSlots((currentSlots) => currentSlots.some((currentSlot) => isSameTimetableSlot(currentSlot, slot)) ? currentSlots.filter((currentSlot) => !isSameTimetableSlot(currentSlot, slot)) : [...currentSlots, slot]);
  }, []);

  const handleSave = useCallback(() => {
    void onSave({ id: course?.id, semesterId, syllabusCourseId: course?.syllabusCourseId, institutionId: course?.institutionId, departmentId: course?.departmentId, title, room, teacher, memo, colorKey, slots, createdAt: course?.createdAt }).then(onClose);
  }, [colorKey, course, memo, onClose, onSave, room, semesterId, slots, teacher, title]);

  const handleDelete = useCallback(() => {
    if (!course) return;
    void onDelete(course.id).then(onClose);
  }, [course, onClose, onDelete]);

  const isSaveDisabled = title.trim().length === 0 || slots.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-6" role="dialog" aria-modal="true" aria-label="授業編集">
      <div className="flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-[22px] border border-[#e5e5ea] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f2] px-5 py-4">
          <h2 className="text-[17px] font-bold tracking-[-0.03em] text-[#1c1c1e]">{course ? "授業を編集" : "授業を追加"}</h2>
          <button type="button" className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#6e6e73] hover:bg-[#f7f7f8]" onClick={onClose}>閉じる</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-3">
            <input className="h-11 rounded-[14px] border border-[#e5e5ea] px-3 text-[15px] font-semibold text-[#1c1c1e] outline-none focus:border-[#007aff]" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="授業名" />
            <div className="grid grid-cols-2 gap-3">
              <input className="h-10 rounded-[12px] border border-[#e5e5ea] px-3 text-[14px] font-semibold text-[#1c1c1e] outline-none focus:border-[#007aff]" value={room} onChange={(event) => setRoom(event.target.value)} placeholder="教室" />
              <input className="h-10 rounded-[12px] border border-[#e5e5ea] px-3 text-[14px] font-semibold text-[#1c1c1e] outline-none focus:border-[#007aff]" value={teacher} onChange={(event) => setTeacher(event.target.value)} placeholder="担当教員" />
            </div>
            <textarea className="min-h-[72px] rounded-[12px] border border-[#e5e5ea] px-3 py-2 text-[14px] font-medium text-[#1c1c1e] outline-none focus:border-[#007aff]" value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="メモ" />
            <>
              <div className="mb-2 text-[12px] font-bold text-[#6e6e73]">色</div>
              <div className="flex flex-wrap gap-2">
                {TAG_COLOR_KEYS.map((key) => <button key={key} type="button" className={cn("h-8 w-8 rounded-full border-2", colorKey === key ? "border-[#007aff]" : "border-transparent")} style={getTimetableEntryStyle(key)} onClick={() => setColorKey(key)} aria-label={`色 ${key}`} />)}
              </div>
            </>
            <>
              <div className="mb-2 text-[12px] font-bold text-[#6e6e73]">曜日・時限</div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `52px repeat(${visibleDayCount}, minmax(0, 1fr))` }}>
                <div />
                {TIMETABLE_DAY_LABELS.slice(0, visibleDayCount).map((label) => <div key={label} className="text-center text-[12px] font-bold text-[#6e6e73]">{label}</div>)}
                {periods.map((period) => <div key={period.id} className="contents"><div className="flex items-center justify-end pr-2 text-[12px] font-bold text-[#6e6e73]">{period.label}</div>{TIMETABLE_DAY_LABELS.slice(0, visibleDayCount).map((_, dayIndex) => {
                  const slot = { dayIndex: dayIndex as CalendarTimetableWeekdayIndex, periodId: period.id };
                  const selected = slots.some((currentSlot) => isSameTimetableSlot(currentSlot, slot));
                  return <button key={`${dayIndex}-${period.id}`} type="button" className={cn("flex h-9 items-center justify-center rounded-[10px] border text-[12px] font-bold", selected ? "border-[#007aff] bg-[#e8f2ff] text-[#007aff]" : "border-[#e5e5ea] bg-white text-[#c7c7cc]")} onClick={() => toggleSlot(slot)}>{selected && StratisCheckIcon ? <StratisCheckIcon className="h-4 w-4" aria-hidden="true" focusable="false" /> : null}</button>;
                })}</div>)}
              </div>
            </>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-[#f0f0f2] px-5 py-4">
          <button type="button" className="rounded-full px-3 py-2 text-[13px] font-bold text-[#ff3b30] disabled:text-[#c7c7cc]" disabled={!course} onClick={handleDelete}>削除</button>
          <button type="button" className="rounded-full bg-[#007aff] px-5 py-2 text-[14px] font-bold text-white disabled:bg-[#c7c7cc]" disabled={isSaveDisabled} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
};

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
    <div className={cn("flex h-full min-h-0 min-w-0 flex-col bg-white text-[#1c1c1e]", className)}>
      <div className={cn("flex shrink-0 flex-wrap items-center justify-between gap-3 pb-3 pt-1", isCompact ? "px-4" : "px-5")}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={cn("rounded-full border border-[#eee] bg-[#f8f8f9] font-semibold tabular-nums text-[#6e6e73]", isCompact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]")}>{weekRangeLabel}</span>
          <span className={cn("rounded-full border border-[#eee] bg-white font-semibold text-[#8f929c]", isCompact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]")}>{visibleDayCount}日 / {periods.length}限</span>
          <span className={cn("rounded-full border border-[#eee] bg-white font-semibold text-[#8f929c]", isCompact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]")}>{isLoading ? "読み込み中" : `${registeredCountLabel}登録済み`}</span>
          <span className={cn("rounded-full border border-[#eee] bg-white font-semibold text-[#8f929c]", isCompact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]")}>授業DB {syllabusCourses.length}件</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className={cn("rounded-full border border-[#e5e5ea] bg-white font-bold text-[#007aff] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-[#f7f7f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]", isCompact ? "h-8 px-3 text-[12px]" : "h-9 px-4 text-[13px]")} onClick={handleOpenSyllabusCatalog}>授業DB</button>
          <button type="button" aria-label="時間割設定" className={cn("flex items-center justify-center rounded-full border border-[#e5e5ea] bg-white text-[#6e6e73] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-[#f7f7f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]", isCompact ? "h-8 w-8" : "h-9 w-9")} onClick={handleOpenSettings}>{StratisSettingsIcon ? <StratisSettingsIcon className={cn(isCompact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden="true" focusable="false" /> : null}</button>
        </div>
      </div>
      <div className={cn("min-h-0 flex-1 text-center scrollbar-hidden", isCompact ? "overflow-y-auto overflow-x-hidden px-4 pb-3" : "overflow-auto px-5 pb-5")}>
        <div className={cn("gap-y-2 text-left", isCompact ? "grid w-full min-w-0 gap-x-1" : "inline-grid w-max gap-x-2")} style={timetableGridStyle}>
          <div aria-hidden="true" className={isCompact ? "h-7" : "h-8"} />
          {weekDays.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={day.toISOString()} className={cn("flex min-w-0 items-center justify-center text-center", isCompact ? "h-7 gap-1" : "h-8 gap-1.5")}>
                <span className={cn("font-bold tracking-[-0.02em]", isCompact ? "text-[11px]" : "text-[13px]", isToday ? "text-[#007aff]" : "text-[#1c1c1e]")}>{format(day, "E", { locale: ja })}</span>
                <span className={cn("rounded-full font-semibold tabular-nums", isCompact ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[10px]", isToday ? "bg-[#e8f2ff] text-[#007aff]" : "bg-[#f7f7f8] text-[#8f929c]")}>{format(day, "M/d", { locale: ja })}</span>
              </div>
            );
          })}
          {periods.map((period) => (
            <div key={period.id} className="contents">
              <div className={cn("flex items-center justify-end pr-1", isCompact ? "min-h-[48px]" : "min-h-[52px]")}>
                <div className={cn("flex items-center justify-end text-right", isCompact ? "gap-1" : "gap-2")}>
                  <div className={cn("font-bold leading-none tracking-[-0.04em] text-[#111]", isCompact ? "text-[17px]" : "text-[20px]")}>{period.label}</div>
                  <div className={cn("flex flex-col items-center font-medium leading-none tabular-nums text-[#8f929c]", isCompact ? "text-[8px]" : "text-[10px]")}><span>{period.startTime}</span><span aria-hidden="true" className="my-0.5 h-2 w-px bg-[#d8d8df]" /><span>{period.endTime}</span></div>
                </div>
              </div>
              {weekDays.map((day) => {
                const slot = { dayIndex: getTimetableEntryDayIndex(day), periodId: period.id };
                const entry = courseSlotMap.get(createTimetableSlotKey(slot)) ?? null;
                return (
                  <button key={`${day.toISOString()}-${period.id}`} type="button" aria-label={`${format(day, "M月d日 EEEE", { locale: ja })} ${period.label}限`} className={cn("relative min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]", isCompact ? "min-h-[48px] rounded-[14px]" : "min-h-[52px] rounded-[18px]", entry ? (isCompact ? "border px-1.5 py-1" : "border px-2.5 py-1") : "border border-dashed border-[#dadde3] bg-[rgba(255,255,255,0.62)] text-[#a1a1aa] hover:border-[#c7c7cc] hover:bg-[#fafafa]")} style={entry ? getTimetableEntryStyle(entry.colorKey) : undefined} onClick={() => handleOpenCourseEditor(entry, slot)}>
                    {entry ? <span className={cn("flex h-full flex-col items-center justify-center text-center", isCompact ? "min-h-[36px]" : "min-h-[40px]")}><span className={cn("max-w-full truncate font-semibold leading-snug tracking-[-0.01em] text-inherit", isCompact ? "text-[10px]" : "text-[11px]")}>{entry.title}</span><span className={cn("mt-0.5 max-w-full truncate font-semibold leading-snug opacity-80", isCompact ? "text-[10px]" : "text-[11px]")}>{entry.room || entry.teacher}</span>{entry.memo ? <span className={cn("mt-0.5 max-w-full truncate font-semibold leading-snug opacity-60", isCompact ? "text-[10px]" : "text-[11px]")}>{entry.memo}</span> : null}</span> : <span className="flex h-full items-center justify-center text-center">{StratisPlusIcon ? <StratisPlusIcon className="h-5 w-5" aria-hidden="true" focusable="false" /> : null}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {isCourseEditorOpen ? <CalendarTimetableCourseEditor course={editingCourse} semesterId={activeSemesterId} initialSlot={editingSlot} periods={periods} visibleDayCount={visibleDayCount} onSave={saveCourse} onDelete={deleteCourse} onClose={handleCloseCourseEditor} /> : null}
      {isSettingsOpen ? <CalendarTimetableSettingsPanel periods={periods} visibleDayCount={visibleDayCount} onChangeVisibleDayCount={updateVisibleDayCount} onAddPeriod={addPeriod} onUpdatePeriod={updatePeriod} onDeletePeriod={deletePeriod} onClose={handleCloseSettings} /> : null}
      {isSyllabusCatalogOpen ? <CalendarTimetableSyllabusCatalogPanel activeSemesterId={activeSemesterId} institutions={institutions} periods={periods} syllabusCourses={syllabusCourses} onSearch={searchSyllabusCourses} onSaveSyllabusCourse={saveSyllabusCourse} onAddCourseFromSyllabus={addCourseFromSyllabus} onClose={handleCloseSyllabusCatalog} /> : null}
    </div>
  );
};

const CalendarTimetableView = memo(CalendarTimetableViewComponent);

CalendarTimetableView.displayName = "CalendarTimetableView";

export { CalendarTimetableView };
