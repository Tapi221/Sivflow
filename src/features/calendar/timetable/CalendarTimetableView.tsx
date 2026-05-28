import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

type TimetablePeriod = {
  label: string;
  time: string;
};

type TimetableEntry = {
  id: string;
  dayIndex: number;
  periodIndex: number;
  title: string;
  room: string;
  memo: string;
  color: string;
  updatedAt: string;
};

type StoredTimetableEntry = Partial<TimetableEntry>;

type TimetableDraft = Pick<TimetableEntry, "title" | "room" | "memo" | "color">;

type TimetableSlot = {
  dayIndex: number;
  periodIndex: number;
};

type CalendarTimetableViewProps = {
  weekDate: Date;
  className?: string;
};

const TIMETABLE_STORAGE_KEY = "flashcard-master:schedule:timetable";
const TIMETABLE_DAY_COUNT = 7;
const TIMETABLE_GRID_TEMPLATE_COLUMNS = "86px repeat(7, minmax(118px, 1fr))";
const TIMETABLE_PERIODS: readonly TimetablePeriod[] = [
  { label: "1", time: "08:50-10:20" },
  { label: "2", time: "10:30-12:00" },
  { label: "3", time: "13:00-14:30" },
  { label: "4", time: "14:40-16:10" },
  { label: "5", time: "16:20-17:50" },
  { label: "6", time: "18:00-19:30" },
  { label: "7", time: "19:40-21:10" },
];
const TIMETABLE_COLORS = [
  "#dbeafe",
  "#dcfce7",
  "#fee2e2",
  "#fef3c7",
  "#e0e7ff",
  "#ccfbf1",
  "#fce7f3",
  "#ede9fe",
] as const;
const EMPTY_TIMETABLE_DRAFT: TimetableDraft = {
  title: "",
  room: "",
  memo: "",
  color: TIMETABLE_COLORS[0],
};

const createTimetableEntryId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `timetable:${crypto.randomUUID()}`;
  }

  return `timetable:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
};

const createTimetableSlotKey = ({ dayIndex, periodIndex }: TimetableSlot): string => `${dayIndex}:${periodIndex}`;

const isValidTimetableIndex = (value: unknown, max: number): value is number => (
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < max
);

const normalizeStoredTimetableEntry = (
  item: unknown,
  index: number,
): TimetableEntry | null => {
  const entry = item as StoredTimetableEntry;
  const title = typeof entry.title === "string" ? entry.title.trim() : "";

  if (!title) return null;
  if (!isValidTimetableIndex(entry.dayIndex, TIMETABLE_DAY_COUNT)) return null;
  if (!isValidTimetableIndex(entry.periodIndex, TIMETABLE_PERIODS.length)) return null;

  return {
    id: typeof entry.id === "string" ? entry.id : createTimetableEntryId(),
    dayIndex: entry.dayIndex,
    periodIndex: entry.periodIndex,
    title,
    room: typeof entry.room === "string" ? entry.room : "",
    memo: typeof entry.memo === "string" ? entry.memo : "",
    color: typeof entry.color === "string" && entry.color ? entry.color : TIMETABLE_COLORS[index % TIMETABLE_COLORS.length],
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
  };
};

const readStoredTimetableEntries = (): TimetableEntry[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(TIMETABLE_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item, index): TimetableEntry[] => {
      const entry = normalizeStoredTimetableEntry(item, index);

      return entry ? [entry] : [];
    });
  } catch {
    return [];
  }
};

const persistTimetableEntries = (entries: TimetableEntry[]) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage が利用できない環境では画面上の編集状態だけを維持する。
  }
};

const buildTimetableWeekDays = (weekDate: Date): Date[] => {
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });

  return Array.from({ length: TIMETABLE_DAY_COUNT }, (_, index) => addDays(weekStart, index));
};

const createInitialTimetableSlot = (weekDate: Date): TimetableSlot => {
  const todayTime = new Date().getTime();
  const todayIndex = buildTimetableWeekDays(weekDate).findIndex((day) => isSameDay(day, todayTime));

  return {
    dayIndex: todayIndex >= 0 ? todayIndex : 0,
    periodIndex: 0,
  };
};

const createEmptyDraftForSlot = ({ dayIndex, periodIndex }: TimetableSlot): TimetableDraft => ({
  ...EMPTY_TIMETABLE_DRAFT,
  color: TIMETABLE_COLORS[(dayIndex + periodIndex) % TIMETABLE_COLORS.length],
});

const createDraftFromEntry = (entry: TimetableEntry | null, slot: TimetableSlot): TimetableDraft => {
  if (!entry) return createEmptyDraftForSlot(slot);

  return {
    title: entry.title,
    room: entry.room,
    memo: entry.memo,
    color: entry.color,
  };
};

const getEntryCountLabel = (count: number): string => `${count}コマ登録済み`;

const CalendarTimetableViewComponent = ({
  weekDate,
  className,
}: CalendarTimetableViewProps) => {
  const [entries, setEntries] = useState<TimetableEntry[]>(readStoredTimetableEntries);
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot>(() => createInitialTimetableSlot(weekDate));
  const [draft, setDraft] = useState<TimetableDraft>(() => createEmptyDraftForSlot(createInitialTimetableSlot(weekDate)));

  const weekDays = useMemo(() => buildTimetableWeekDays(weekDate), [weekDate]);
  const entriesBySlot = useMemo(() => {
    const map = new Map<string, TimetableEntry>();

    entries.forEach((entry) => {
      map.set(createTimetableSlotKey(entry), entry);
    });

    return map;
  }, [entries]);
  const selectedEntry = entriesBySlot.get(createTimetableSlotKey(selectedSlot)) ?? null;
  const selectedDay = weekDays[selectedSlot.dayIndex] ?? weekDays[0];
  const selectedPeriod = TIMETABLE_PERIODS[selectedSlot.periodIndex] ?? TIMETABLE_PERIODS[0];
  const selectedSlotLabel = `${format(selectedDay, "M/d EEE", { locale: ja })} ${selectedPeriod.label}限`;
  const weekRangeLabel = `${format(weekDays[0], "M/d", { locale: ja })} - ${format(weekDays[weekDays.length - 1], "M/d", { locale: ja })}`;

  useEffect(() => {
    persistTimetableEntries(entries);
  }, [entries]);

  const handleSelectSlot = useCallback(
    (slot: TimetableSlot) => {
      const entry = entriesBySlot.get(createTimetableSlotKey(slot)) ?? null;

      setSelectedSlot(slot);
      setDraft(createDraftFromEntry(entry, slot));
    },
    [entriesBySlot],
  );

  const handleChangeDraft = useCallback((field: keyof TimetableDraft, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const title = draft.title.trim();
      if (!title) return;

      const slotKey = createTimetableSlotKey(selectedSlot);
      const now = new Date().toISOString();

      setEntries((currentEntries) => {
        const existingEntry = currentEntries.find((entry) => createTimetableSlotKey(entry) === slotKey);
        const nextEntry: TimetableEntry = {
          id: existingEntry?.id ?? createTimetableEntryId(),
          dayIndex: selectedSlot.dayIndex,
          periodIndex: selectedSlot.periodIndex,
          title,
          room: draft.room.trim(),
          memo: draft.memo.trim(),
          color: draft.color,
          updatedAt: now,
        };

        if (existingEntry) {
          return currentEntries.map((entry) => createTimetableSlotKey(entry) === slotKey ? nextEntry : entry);
        }

        return [...currentEntries, nextEntry];
      });
    },
    [draft, selectedSlot],
  );

  const handleDelete = useCallback(() => {
    const slotKey = createTimetableSlotKey(selectedSlot);

    setEntries((currentEntries) => currentEntries.filter((entry) => createTimetableSlotKey(entry) !== slotKey));
    setDraft(createEmptyDraftForSlot(selectedSlot));
  }, [selectedSlot]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-white text-[#1c1c1e]", className)}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#eeeeee] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f929c]">Timetable</p>
          <h2 className="truncate text-[18px] font-bold tracking-[-0.03em] text-[#1c1c1e]">時間割</h2>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-[#f7f7f7] px-3 py-1 text-[12px] font-semibold text-[#6e6e73]">
          <span>{weekRangeLabel}</span>
          <span className="h-1 w-1 rounded-full bg-[#c7c7cc]" />
          <span>{getEntryCountLabel(entries.length)}</span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-h-[420px] overflow-auto rounded-[24px] border border-[#eeeeee] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] scrollbar-hidden">
          <div className="grid min-w-[912px]" style={{ gridTemplateColumns: TIMETABLE_GRID_TEMPLATE_COLUMNS }}>
            <div className="sticky left-0 top-0 z-30 border-b border-r border-[#eeeeee] bg-white" />

            {weekDays.map((day, dayIndex) => {
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "sticky top-0 z-20 border-b border-r border-[#eeeeee] bg-white px-3 py-2 text-center",
                    dayIndex === weekDays.length - 1 && "border-r-0",
                  )}
                >
                  <div className={cn("text-[12px] font-semibold text-[#6e6e73]", isToday && "text-[#007aff]")}>{format(day, "EEE", { locale: ja })}</div>
                  <div className={cn("mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold", isToday ? "bg-[#007aff] text-white" : "text-[#1c1c1e]")}>{format(day, "d")}</div>
                </div>
              );
            })}

            {TIMETABLE_PERIODS.map((period, periodIndex) => (
              <div key={period.label} className="contents">
                <div className="sticky left-0 z-10 flex min-h-[92px] flex-col items-end justify-center border-b border-r border-[#eeeeee] bg-white px-3 text-right">
                  <div className="text-[16px] font-bold text-[#1c1c1e]">{period.label}限</div>
                  <div className="mt-1 text-[10px] font-medium tabular-nums text-[#8f929c]">{period.time}</div>
                </div>

                {weekDays.map((day, dayIndex) => {
                  const slot = { dayIndex, periodIndex } satisfies TimetableSlot;
                  const entry = entriesBySlot.get(createTimetableSlotKey(slot)) ?? null;
                  const isSelected = selectedSlot.dayIndex === dayIndex && selectedSlot.periodIndex === periodIndex;

                  return (
                    <button
                      key={`${day.toISOString()}-${period.label}`}
                      type="button"
                      className={cn(
                        "min-h-[92px] border-b border-r border-[#eeeeee] bg-white p-1.5 text-left outline-none transition hover:bg-[#f8f8f8] focus-visible:ring-2 focus-visible:ring-[#007aff]",
                        dayIndex === weekDays.length - 1 && "border-r-0",
                        isSelected && "bg-[#f5f9ff] ring-2 ring-inset ring-[#007aff]",
                      )}
                      onClick={() => handleSelectSlot(slot)}
                      aria-label={`${format(day, "M月d日 EEEE", { locale: ja })} ${period.label}限を編集`}
                    >
                      {entry ? (
                        <div className="flex h-full min-h-[76px] flex-col rounded-[14px] px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)]" style={{ backgroundColor: entry.color }}>
                          <span className="truncate text-[13px] font-bold tracking-[-0.01em] text-[#1c1c1e]">{entry.title}</span>
                          {entry.room && <span className="mt-1 truncate text-[11px] font-semibold text-[rgba(28,28,30,0.62)]">{entry.room}</span>}
                          {entry.memo && <span className="mt-auto line-clamp-2 text-[10px] font-medium leading-snug text-[rgba(28,28,30,0.52)]">{entry.memo}</span>}
                        </div>
                      ) : (
                        <div className="flex h-full min-h-[76px] items-center justify-center rounded-[14px] border border-dashed border-[#d9d9df] text-[12px] font-semibold text-[#c7c7cc]">
                          追加
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <form className="flex min-h-0 flex-col rounded-[24px] border border-[#eeeeee] bg-[#fbfbfd] p-4" onSubmit={handleSubmit}>
          <div className="shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f929c]">Edit</p>
            <h3 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-[#1c1c1e]">{selectedSlotLabel}</h3>
          </div>

          <label className="mt-4 block text-[12px] font-semibold text-[#6e6e73]">
            科目
            <input
              value={draft.title}
              onChange={(event) => handleChangeDraft("title", event.target.value)}
              className="mt-1 h-10 w-full rounded-[14px] border border-[#e5e5ea] bg-white px-3 text-[14px] font-semibold text-[#1c1c1e] outline-none transition focus:border-[#007aff]"
              placeholder="例: 英語、数学、物理"
              maxLength={40}
            />
          </label>

          <label className="mt-3 block text-[12px] font-semibold text-[#6e6e73]">
            教室 / 場所
            <input
              value={draft.room}
              onChange={(event) => handleChangeDraft("room", event.target.value)}
              className="mt-1 h-10 w-full rounded-[14px] border border-[#e5e5ea] bg-white px-3 text-[14px] font-medium text-[#1c1c1e] outline-none transition focus:border-[#007aff]"
              placeholder="例: 2-1、図書室、オンライン"
              maxLength={40}
            />
          </label>

          <label className="mt-3 block text-[12px] font-semibold text-[#6e6e73]">
            メモ
            <textarea
              value={draft.memo}
              onChange={(event) => handleChangeDraft("memo", event.target.value)}
              className="mt-1 min-h-[92px] w-full resize-none rounded-[14px] border border-[#e5e5ea] bg-white px-3 py-2 text-[13px] font-medium leading-relaxed text-[#1c1c1e] outline-none transition focus:border-[#007aff]"
              placeholder="課題、持ち物、範囲など"
              maxLength={120}
            />
          </label>

          <div className="mt-3">
            <p className="text-[12px] font-semibold text-[#6e6e73]">色</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {TIMETABLE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "h-9 rounded-[12px] border border-[#e5e5ea] outline-none transition focus-visible:ring-2 focus-visible:ring-[#007aff]",
                    draft.color === color && "ring-2 ring-[#007aff] ring-offset-2",
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => handleChangeDraft("color", color)}
                  aria-label={`${color}を選択`}
                />
              ))}
            </div>
          </div>

          <div className="mt-auto flex shrink-0 gap-2 pt-4">
            <button
              type="submit"
              disabled={!draft.title.trim()}
              className="h-10 flex-1 rounded-[14px] bg-[#007aff] px-4 text-[13px] font-bold text-white transition hover:bg-[#006fe6] disabled:cursor-not-allowed disabled:bg-[#c7c7cc]"
            >
              保存
            </button>
            <button
              type="button"
              disabled={!selectedEntry}
              onClick={handleDelete}
              className="h-10 rounded-[14px] border border-[#ffd1cc] bg-white px-4 text-[13px] font-bold text-[#ff3b30] transition hover:bg-[#fff4f2] disabled:cursor-not-allowed disabled:border-[#eeeeee] disabled:text-[#c7c7cc]"
            >
              削除
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CalendarTimetableView = memo(CalendarTimetableViewComponent);

CalendarTimetableView.displayName = "CalendarTimetableView";

export { CalendarTimetableView };
