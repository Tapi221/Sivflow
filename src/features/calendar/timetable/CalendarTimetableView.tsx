import { memo } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import { cn } from "@/lib/utils";

type TimetablePeriod = {
  label: string;
  startTime: string;
  endTime: string;
};

type TimetableEntry = {
  id: string;
  dayIndex: number;
  periodIndex: number;
  title: string;
  room: string;
  accentColor: string;
  note?: string;
};

type TimetableSlot = {
  dayIndex: number;
  periodIndex: number;
};

type CalendarTimetableViewProps = {
  weekDate: Date;
  className?: string;
};

const TIMETABLE_DAY_LABELS = ["月", "火", "水", "木", "金"] as const;
const TIMETABLE_GRID_TEMPLATE_COLUMNS = "76px repeat(5, minmax(156px, 1fr))";
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
  { id: "materials-mon-1", dayIndex: 0, periodIndex: 0, title: "材料力学", room: "5N-301", accentColor: "#46D6DB" },
  { id: "fluid-engineering-mon-2", dayIndex: 0, periodIndex: 1, title: "流体工学", room: "L301", accentColor: "#5484ED" },
  { id: "linear-algebra-mon-3", dayIndex: 0, periodIndex: 2, title: "線形代数", room: "B202", accentColor: "#A47AE2" },
  { id: "elasticity-mon-4", dayIndex: 0, periodIndex: 3, title: "弾性力学", room: "L401", accentColor: "#FBD75B" },
  { id: "heat-transfer-mon-5", dayIndex: 0, periodIndex: 4, title: "伝熱工学", room: "5N-201", accentColor: "#DC2127" },
  { id: "complex-tue-1", dayIndex: 1, periodIndex: 0, title: "複素解析", room: "L401", accentColor: "#A47AE2" },
  { id: "complex-tue-2", dayIndex: 1, periodIndex: 1, title: "複素解析", room: "L401", accentColor: "#A47AE2" },
  { id: "fluid-engineering-tue-3", dayIndex: 1, periodIndex: 2, title: "流体工学", room: "L301", accentColor: "#5484ED" },
  { id: "elasticity-tue-4", dayIndex: 1, periodIndex: 3, title: "弾性力学", room: "L401", accentColor: "#FBD75B" },
  { id: "thermo-wed-1", dayIndex: 2, periodIndex: 0, title: "熱力学", room: "L402", accentColor: "#DBADFF" },
  { id: "thermo-wed-2", dayIndex: 2, periodIndex: 1, title: "熱力学", room: "L402", accentColor: "#DBADFF" },
  { id: "materials-wed-3", dayIndex: 2, periodIndex: 2, title: "材料力学", room: "5N-301", accentColor: "#46D6DB" },
  { id: "statistics-wed-5", dayIndex: 2, periodIndex: 4, title: "統計学", room: "B203", accentColor: "#A47AE2" },
  { id: "fluid-thu-1", dayIndex: 3, periodIndex: 0, title: "流体力学", room: "L301", accentColor: "#5484ED" },
  { id: "mechanics-thu-2", dayIndex: 3, periodIndex: 1, title: "機械力学", room: "3S-301", accentColor: "#FBD75B" },
  { id: "info-thu-3", dayIndex: 3, periodIndex: 2, title: "情報科学", room: "B303", accentColor: "#8E8E93" },
  { id: "material-science-thu-4", dayIndex: 3, periodIndex: 3, title: "材料科学", room: "3N-301", accentColor: "#51B749" },
  { id: "material-science-thu-5", dayIndex: 3, periodIndex: 4, title: "材料科学", room: "3N-301", accentColor: "#51B749" },
  { id: "mechanics-fri-1", dayIndex: 4, periodIndex: 0, title: "機械力学", room: "3S-301", accentColor: "#FBD75B" },
  { id: "fluid-fri-2", dayIndex: 4, periodIndex: 1, title: "流体力学", room: "L301", accentColor: "#5484ED" },
  { id: "heat-transfer-fri-3", dayIndex: 4, periodIndex: 2, title: "伝熱工学", room: "5N-201", accentColor: "#DC2127" },
  { id: "design-fri-4", dayIndex: 4, periodIndex: 3, title: "設計演習", room: "CAD室", accentColor: "#8E8E93" },
];

const createTimetableSlotKey = ({ dayIndex, periodIndex }: TimetableSlot): string => `${dayIndex}:${periodIndex}`;

const buildTimetableWeekDays = (weekDate: Date): Date[] => {
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });

  return Array.from({ length: TIMETABLE_DAY_LABELS.length }, (_, index) => addDays(weekStart, index));
};

const createTimetableEntryMap = () => {
  const map = new Map<string, TimetableEntry>();

  TIMETABLE_ENTRIES.forEach((entry) => {
    map.set(createTimetableSlotKey(entry), entry);
  });

  return map;
};

const formatTimetableWeekRange = (weekDays: Date[]): string => `${format(weekDays[0], "M/d", { locale: ja })} - ${format(weekDays[weekDays.length - 1], "M/d", { locale: ja })}`;

const getTimetableEntryStyle = (accentColor: string) => {
  const tokens = generateColorTokens(accentColor);

  return {
    background: tokens.bg,
    borderColor: tokens.border,
    color: tokens.text,
  };
};

const TIMETABLE_ENTRY_MAP = createTimetableEntryMap();

const CalendarTimetableViewComponent = ({
  weekDate,
  className,
}: CalendarTimetableViewProps) => {
  const weekDays = buildTimetableWeekDays(weekDate);
  const weekRangeLabel = formatTimetableWeekRange(weekDays);
  const registeredCountLabel = `${TIMETABLE_ENTRIES.length}コマ`;

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-white text-[#1c1c1e]", className)}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 pb-4 pt-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#eeeeee] bg-[#f8f8f9] px-3 py-1.5 text-[12px] font-semibold tabular-nums text-[#6e6e73]">
            {weekRangeLabel}
          </span>
          <span className="rounded-full border border-[#eeeeee] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#8f929c]">
            平日5日 / 7限
          </span>
          <span className="rounded-full border border-[#eeeeee] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#8f929c]">
            {registeredCountLabel}配置済み
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className="inline-flex h-9 items-center justify-center rounded-[14px] border border-[#e5e5ea] bg-white px-4 text-[13px] font-bold tracking-[-0.01em] text-[#1c1c1e] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-[#f7f7f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]">
            <span className="mr-1.5 text-[16px] leading-none text-[#6e6e73]">＋</span>
            授業を追加
          </button>
          <button type="button" aria-label="時間割設定" className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-[#e5e5ea] bg-white text-[15px] text-[#6e6e73] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-[#f7f7f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]">
            ⚙︎
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-5 pb-5 scrollbar-hidden">
        <div className="grid min-w-[980px] gap-x-3 gap-y-3" style={{ gridTemplateColumns: TIMETABLE_GRID_TEMPLATE_COLUMNS }}>
          <div aria-hidden="true" className="h-10" />

          {weekDays.map((day, dayIndex) => {
            const isToday = isSameDay(day, new Date());

            return (
              <div key={day.toISOString()} className="flex h-10 items-center justify-center gap-2 text-center">
                <span className={cn("text-[14px] font-bold tracking-[-0.02em]", isToday ? "text-[#007aff]" : "text-[#1c1c1e]")}>{TIMETABLE_DAY_LABELS[dayIndex]}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", isToday ? "bg-[#e8f2ff] text-[#007aff]" : "bg-[#f7f7f8] text-[#8f929c]")}>{format(day, "M/d", { locale: ja })}</span>
              </div>
            );
          })}

          {TIMETABLE_PERIODS.map((period, periodIndex) => (
            <div key={period.label} className="contents">
              <div className="flex min-h-[94px] items-center justify-end pr-1">
                <div className="flex items-center justify-end gap-3 text-right">
                  <div className="text-[24px] font-bold leading-none tracking-[-0.04em] text-[#111111]">{period.label}</div>
                  <div className="flex flex-col items-center text-[11px] font-medium leading-none tabular-nums text-[#8f929c]">
                    <span>{period.startTime}</span>
                    <span aria-hidden="true" className="my-1 h-3 w-px bg-[#d8d8df]" />
                    <span>{period.endTime}</span>
                  </div>
                </div>
              </div>

              {weekDays.map((day, dayIndex) => {
                const slot = { dayIndex, periodIndex } satisfies TimetableSlot;
                const entry = TIMETABLE_ENTRY_MAP.get(createTimetableSlotKey(slot)) ?? null;

                return (
                  <button key={`${day.toISOString()}-${period.label}`} type="button" aria-label={`${format(day, "M月d日 EEEE", { locale: ja })} ${period.label}限`} className={cn("relative min-h-[94px] rounded-[16px] text-left outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]", entry ? "border px-4 py-3" : "border border-dashed border-[#dadde3] bg-[rgba(255,255,255,0.62)] text-[#a1a1aa] hover:border-[#c7c7cc] hover:bg-[#fafafa]")} style={entry ? getTimetableEntryStyle(entry.accentColor) : undefined}>
                    {entry ? (
                      <span className="flex h-full min-h-[68px] flex-col items-center justify-center text-center">
                        <span className="max-w-full truncate text-[11px] font-semibold leading-snug tracking-[-0.01em] text-inherit">{entry.title}</span>
                        <span className="mt-1 max-w-full truncate text-[11px] font-semibold leading-snug text-[rgba(28,28,30,0.78)]">{entry.room}</span>
                        {entry.note ? <span className="mt-2 max-w-full truncate text-[11px] font-semibold leading-snug text-[rgba(28,28,30,0.48)]">{entry.note}</span> : null}
                      </span>
                    ) : (
                      <span className="flex h-full min-h-[68px] items-center justify-center">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e5e5ea] bg-white text-[18px] font-light leading-none text-[#8f929c] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">＋</span>
                      </span>
                    )}
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
