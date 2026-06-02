import { memo } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { getTagColorStyle, type TagColorKey } from "@/chip/tag/tagColor";
import { cn } from "@/lib/utils";

type TimetablePeriod = { label: string; startTime: string; endTime: string };

type TimetableEntry = { id: string; dayIndex: number; periodIndex: number; title: string; room: string; colorKey: TagColorKey; note?: string };

type TimetableSlot = { dayIndex: number; periodIndex: number };

type CalendarTimetableDensity = "default" | "compact";

type CalendarTimetableViewProps = { weekDate: Date; density?: CalendarTimetableDensity; className?: string };

const TIMETABLE_DAY_LABELS = ["月", "火", "水", "木", "金"] as const;
const TIMETABLE_GRID_TEMPLATE_COLUMNS = "56px repeat(5, 112px)";
const TIMETABLE_COMPACT_GRID_TEMPLATE_COLUMNS = "34px repeat(5, minmax(0, 1fr))";
const TIMETABLE_PERIODS: readonly TimetablePeriod[] = [
  { label: "1", startTime: "8:50", endTime: "10:20" },
  { label: "2", startTime: "10:30", endTime: "12:00" },
  { label: "3", startTime: "13:00", endTime: "14:30" },
  { label: "4", startTime: "14:40", endTime: "16:10" },
  { label: "5", startTime: "16:20", endTime: "17:50" },
  { label: "6", startTime: "18:00", endTime: "19:30" },
  { label: "7", startTime: "19:40", endTime: "21:10" },
];
const TIMETABLE_ENTRIES: readonly TimetableEntry[] = [
  { id: "materials-mon-1", dayIndex: 0, periodIndex: 0, title: "材料力学", room: "5N-301", colorKey: "teal" },
  { id: "fluid-engineering-mon-2", dayIndex: 0, periodIndex: 1, title: "流体工学", room: "L301", colorKey: "blue" },
  { id: "linear-algebra-mon-3", dayIndex: 0, periodIndex: 2, title: "線形代数", room: "B202", colorKey: "purple" },
  { id: "elasticity-mon-4", dayIndex: 0, periodIndex: 3, title: "弾性力学", room: "L401", colorKey: "amber" },
  { id: "heat-transfer-mon-5", dayIndex: 0, periodIndex: 4, title: "伝熱工学", room: "5N-201", colorKey: "red" },
  { id: "complex-tue-1", dayIndex: 1, periodIndex: 0, title: "複素解析", room: "L401", colorKey: "purple" },
  { id: "complex-tue-2", dayIndex: 1, periodIndex: 1, title: "複素解析", room: "L401", colorKey: "purple" },
  { id: "fluid-engineering-tue-3", dayIndex: 1, periodIndex: 2, title: "流体工学", room: "L301", colorKey: "blue" },
  { id: "elasticity-tue-4", dayIndex: 1, periodIndex: 3, title: "弾性力学", room: "L401", colorKey: "amber" },
  { id: "thermo-wed-1", dayIndex: 2, periodIndex: 0, title: "熱力学", room: "L402", colorKey: "pink" },
  { id: "thermo-wed-2", dayIndex: 2, periodIndex: 1, title: "熱力学", room: "L402", colorKey: "pink" },
  { id: "materials-wed-3", dayIndex: 2, periodIndex: 2, title: "材料力学", room: "5N-301", colorKey: "teal" },
  { id: "statistics-wed-5", dayIndex: 2, periodIndex: 4, title: "統計学", room: "B203", colorKey: "purple" },
  { id: "fluid-thu-1", dayIndex: 3, periodIndex: 0, title: "流体力学", room: "L301", colorKey: "blue" },
  { id: "mechanics-thu-2", dayIndex: 3, periodIndex: 1, title: "機械力学", room: "3S-301", colorKey: "amber" },
  { id: "info-thu-3", dayIndex: 3, periodIndex: 2, title: "情報科学", room: "B303", colorKey: "gray" },
  { id: "material-science-thu-4", dayIndex: 3, periodIndex: 3, title: "材料科学", room: "3N-301", colorKey: "green" },
  { id: "material-science-thu-5", dayIndex: 3, periodIndex: 4, title: "材料科学", room: "3N-301", colorKey: "green" },
  { id: "mechanics-fri-1", dayIndex: 4, periodIndex: 0, title: "機械力学", room: "3S-301", colorKey: "amber" },
  { id: "fluid-fri-2", dayIndex: 4, periodIndex: 1, title: "流体力学", room: "L301", colorKey: "blue" },
  { id: "heat-transfer-fri-3", dayIndex: 4, periodIndex: 2, title: "伝熱工学", room: "5N-201", colorKey: "red" },
  { id: "design-fri-4", dayIndex: 4, periodIndex: 3, title: "設計演習", room: "CAD室", colorKey: "gray" },
];

const createTimetableSlotKey = ({ dayIndex, periodIndex }: TimetableSlot): string => `${dayIndex}:${periodIndex}`;

const buildTimetableWeekDays = (weekDate: Date): Date[] => Array.from({ length: TIMETABLE_DAY_LABELS.length }, (_, index) => addDays(startOfWeek(weekDate, { weekStartsOn: 1 }), index));

const createTimetableEntryMap = () => {
  const map = new Map<string, TimetableEntry>();
  TIMETABLE_ENTRIES.forEach((entry) => map.set(createTimetableSlotKey(entry), entry));
  return map;
};

const formatTimetableWeekRange = (weekDays: Date[]): string => `${format(weekDays[0], "M/d", { locale: ja })} - ${format(weekDays[weekDays.length - 1], "M/d", { locale: ja })}`;

const getTimetableEntryStyle = (colorKey: TagColorKey) => getTagColorStyle(colorKey);

const getTimetableGridTemplateColumns = (density: CalendarTimetableDensity): string => density === "compact" ? TIMETABLE_COMPACT_GRID_TEMPLATE_COLUMNS : TIMETABLE_GRID_TEMPLATE_COLUMNS;

const TIMETABLE_ENTRY_MAP = createTimetableEntryMap();

const CalendarTimetableViewComponent = ({ weekDate, density = "default", className }: CalendarTimetableViewProps) => {
  const weekDays = buildTimetableWeekDays(weekDate);
  const weekRangeLabel = formatTimetableWeekRange(weekDays);
  const registeredCountLabel = `${TIMETABLE_ENTRIES.length}コマ`;
  const isCompact = density === "compact";

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 flex-col bg-white text-[#1c1c1e]", className)}>
      <div className={cn("flex shrink-0 flex-wrap items-center justify-between gap-3 pb-3 pt-1", isCompact ? "px-4" : "px-5")}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={cn("rounded-full border border-[#eeeeee] bg-[#f8f8f9] font-semibold tabular-nums text-[#6e6e73]", isCompact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]")}>{weekRangeLabel}</span>
          <span className={cn("rounded-full border border-[#eeeeee] bg-white font-semibold text-[#8f929c]", isCompact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]")}>平日5日 / 7限</span>
          <span className={cn("rounded-full border border-[#eeeeee] bg-white font-semibold text-[#8f929c]", isCompact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]")}>{registeredCountLabel}配置済み</span>
        </div>
        <button type="button" aria-label="時間割設定" className={cn("flex shrink-0 items-center justify-center rounded-full border border-[#e5e5ea] bg-white text-[#6e6e73] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-[#f7f7f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]", isCompact ? "h-8 w-8 text-[14px]" : "h-9 w-9 text-[15px]")}>⚙︎</button>
      </div>

      <div className={cn("min-h-0 flex-1 text-center scrollbar-hidden", isCompact ? "overflow-y-auto overflow-x-hidden px-4 pb-3" : "overflow-auto px-5 pb-5")}>
        <div className={cn("gap-y-2 text-left", isCompact ? "grid w-full min-w-0 gap-x-1" : "inline-grid w-max gap-x-2")} style={{ gridTemplateColumns: getTimetableGridTemplateColumns(density) }}>
          <div aria-hidden="true" className={isCompact ? "h-7" : "h-8"} />
          {weekDays.map((day, dayIndex) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className={cn("flex min-w-0 items-center justify-center text-center", isCompact ? "h-7 gap-1" : "h-8 gap-1.5")}>
                <span className={cn("font-bold tracking-[-0.02em]", isCompact ? "text-[11px]" : "text-[13px]", isToday ? "text-[#007aff]" : "text-[#1c1c1e]")}>{TIMETABLE_DAY_LABELS[dayIndex]}</span>
                <span className={cn("rounded-full font-semibold tabular-nums", isCompact ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[10px]", isToday ? "bg-[#e8f2ff] text-[#007aff]" : "bg-[#f7f7f8] text-[#8f929c]")}>{format(day, "M/d", { locale: ja })}</span>
              </div>
            );
          })}
          {TIMETABLE_PERIODS.map((period, periodIndex) => (
            <div key={period.label} className="contents">
              <div className={cn("flex items-center justify-end pr-1", isCompact ? "min-h-[48px]" : "min-h-[52px]")}>
                <div className={cn("flex items-center justify-end text-right", isCompact ? "gap-1" : "gap-2")}>
                  <div className={cn("font-bold leading-none tracking-[-0.04em] text-[#111111]", isCompact ? "text-[17px]" : "text-[20px]")}>{period.label}</div>
                  <div className={cn("flex flex-col items-center font-medium leading-none tabular-nums text-[#8f929c]", isCompact ? "text-[8px]" : "text-[10px]")}>
                    <span>{period.startTime}</span>
                    <span aria-hidden="true" className="my-0.5 h-2 w-px bg-[#d8d8df]" />
                    <span>{period.endTime}</span>
                  </div>
                </div>
              </div>
              {weekDays.map((day, dayIndex) => {
                const slot = { dayIndex, periodIndex } satisfies TimetableSlot;
                const entry = TIMETABLE_ENTRY_MAP.get(createTimetableSlotKey(slot)) ?? null;
                return (
                  <button key={`${day.toISOString()}-${period.label}`} type="button" aria-label={`${format(day, "M月d日 EEEE", { locale: ja })} ${period.label}限`} className={cn("relative min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]", isCompact ? "min-h-[48px] rounded-[14px]" : "min-h-[52px] rounded-[18px]", entry ? (isCompact ? "border px-1.5 py-1" : "border px-2.5 py-1") : "border border-dashed border-[#dadde3] bg-[rgba(255,255,255,0.62)] text-[#a1a1aa] hover:border-[#c7c7cc] hover:bg-[#fafafa]")} style={entry ? getTimetableEntryStyle(entry.colorKey) : undefined}>
                    {entry ? (
                      <span className={cn("flex h-full flex-col items-center justify-center text-center", isCompact ? "min-h-[36px]" : "min-h-[40px]")}>
                        <span className={cn("max-w-full truncate font-semibold leading-snug tracking-[-0.01em] text-inherit", isCompact ? "text-[10px]" : "text-[11px]")}>{entry.title}</span>
                        <span className={cn("mt-0.5 max-w-full truncate font-semibold leading-snug opacity-80", isCompact ? "text-[10px]" : "text-[11px]")}>{entry.room}</span>
                        {entry.note ? <span className={cn("mt-0.5 max-w-full truncate font-semibold leading-snug opacity-60", isCompact ? "text-[10px]" : "text-[11px]")}>{entry.note}</span> : null}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CalendarTimetableView = memo(CalendarTimetableViewComponent);

CalendarTimetableView.displayName = "CalendarTimetableView";

export { CalendarTimetableView };
