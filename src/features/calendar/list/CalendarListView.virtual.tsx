import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { differenceInCalendarDays, format, getDaysInMonth, isSameDay, startOfMonth, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.list";
import { LIST_DAY_GAP_PX, LIST_DAY_SECTION_MIN_HEIGHT_PX } from "@/chip/eventchip/EventChip.list.placement";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import { buildScheduleVirtualRailDays, getScheduleVirtualRailDate } from "@/features/calendar/grid/ScheduleColumn.shared";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarListViewProps = { days: Date[]; virtualRail?: ScheduleVirtualRail; events: GoogleCalendarEvent[]; selectedDate: Date; onSelectDate?: (date: Date) => void; onReachStart?: () => void; onReachEnd?: () => void; onVisibleMonthChange?: (date: Date) => void; dayHeights?: Record<string, number>; scrollViewportRef?: React.MutableRefObject<HTMLDivElement | null>; onScrollTopChange?: (scrollTop: number) => void; className?: string };

type CalendarListDay = { date: Date; dateKey: string; events: GoogleCalendarEvent[]; isSelected: boolean; isToday: boolean };

type VirtualRange = { start: number; end: number };

const EMPTY_DAY_LABEL = "予定なし";
const SELECTED_OFFSET = 8;
const ANCHOR_OFFSET = 160;
const LOCAL_DAYS = 3650;
const DAY_BLOCK = LIST_DAY_SECTION_MIN_HEIGHT_PX + LIST_DAY_GAP_PX;
const MATERIALIZE_OVERSCAN = 20_000;
const RANGE_UPDATE_GUARD = 8_000;
const LIST_DAY_RAIL_CLASS_NAME = "pointer-events-none absolute -bottom-2 left-[67px] top-0 w-px -translate-x-1/2 bg-[#eceff3]";

const createRail = (selectedDate: Date): ScheduleVirtualRail => ({ startDate: subDays(startOfMonth(selectedDate), LOCAL_DAYS), anchorIndex: LOCAL_DAYS, totalDayCount: LOCAL_DAYS * 2 + getDaysInMonth(selectedDate) });

const getRange = (scrollTop: number, viewportHeight: number, totalDayCount: number): VirtualRange => {
  if (totalDayCount <= 0) return { start: 0, end: 0 };
  const start = Math.max(0, Math.floor(Math.max(0, scrollTop - MATERIALIZE_OVERSCAN) / DAY_BLOCK));
  const end = Math.min(totalDayCount, Math.ceil((scrollTop + viewportHeight + MATERIALIZE_OVERSCAN) / DAY_BLOCK) + 1);
  return { start, end: Math.max(start, end) };
};

const sameRange = (left: VirtualRange, right: VirtualRange): boolean => left.start === right.start && left.end === right.end;

const shouldRefreshRange = (element: HTMLDivElement, range: VirtualRange): boolean => {
  if (range.end <= range.start) return true;
  const visibleTop = element.scrollTop;
  const visibleBottom = element.scrollTop + element.clientHeight;
  return visibleTop < range.start * DAY_BLOCK + RANGE_UPDATE_GUARD || visibleBottom > range.end * DAY_BLOCK - RANGE_UPDATE_GUARD;
};

const getIndexForDate = (rail: ScheduleVirtualRail, date: Date): number => differenceInCalendarDays(date, rail.startDate);

const getEventInstanceKey = (dateKey: string, event: GoogleCalendarEvent): string => `${dateKey}:${event.id}:${new Date(event.startsAt).getTime()}:${new Date(event.endsAt).getTime()}`;

const buildListDays = (days: Date[], events: GoogleCalendarEvent[], selectedDate: Date): CalendarListDay[] => {
  const today = new Date();
  const eventsByDay = new Map<string, GoogleCalendarEvent[]>();
  const dayByKey = new Map<string, Date>();
  days.forEach((day) => { const key = getCalendarDateKey(day); dayByKey.set(key, day); eventsByDay.set(key, []); });
  events.forEach((event) => getEventDateKeys(event).forEach((key) => { const day = dayByKey.get(key); const dayEvents = eventsByDay.get(key); if (!day || !dayEvents) return; if (event.isAllDay) { dayEvents.push(event); return; } const clipped = clipEventToDay(event, day); if (clipped) dayEvents.push(clipped); }));
  return days.map((date) => { const dateKey = getCalendarDateKey(date); const dayEvents = eventsByDay.get(dateKey) ?? []; dayEvents.sort(compareCalendarEvents); return { date, dateKey, events: dayEvents, isSelected: isSameDay(date, selectedDate), isToday: isSameDay(date, today) }; });
};

const EmptyDayCard = () => <div className="grid h-full min-h-[38px] grid-cols-[54px_26px_minmax(0,1fr)] items-stretch"><div className="pt-2.5 text-right text-[12px] font-medium leading-none text-[#b3b3b3]">—</div><div className="relative flex justify-center"><span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#dedede]" aria-hidden="true" /><span className="relative mt-[8px] h-2 w-2 rounded-full border border-[#dedede] bg-white" aria-hidden="true" /></div><div className="flex h-[34px] items-center rounded-[10px] border border-dashed border-[#dedede] bg-white px-3 text-[12px] font-semibold text-[#8e8e93]">{EMPTY_DAY_LABEL}</div></div>;

const CalendarListDaySection = memo(({ day, onSelectDate }: { day: CalendarListDay; onSelectDate?: (date: Date) => void }) => <section className="grid h-full grid-cols-[58px_minmax(0,1fr)] gap-2" aria-label={format(day.date, "yyyy年M月d日 EEEE", { locale: ja })}><button type="button" className={cn("group mt-0.5 flex h-8 items-baseline justify-end gap-1 rounded-[10px] pr-0.5 text-right transition", "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/25", day.isSelected && "text-[#1c1c1e]")} onClick={() => onSelectDate?.(day.date)}><span className={cn("text-[16px] font-bold leading-none tracking-[-0.03em]", day.isToday ? "text-[#0a84ff]" : "text-[#1c1c1e]")}>{format(day.date, "d")}</span><span className="text-[11px] font-semibold leading-none text-[rgba(60,60,67,0.58)]">{format(day.date, "EEE", { locale: ja })}</span></button><div className="relative h-full overflow-visible"><span className={LIST_DAY_RAIL_CLASS_NAME} aria-hidden="true" /><div className="relative h-full space-y-1.5 overflow-hidden">{day.events.length > 0 ? day.events.map((event) => <CalendarEventChipList key={getEventInstanceKey(day.dateKey, event)} event={event} />) : <EmptyDayCard />}</div></div></section>);

CalendarListDaySection.displayName = "CalendarListDaySection";

const CalendarListViewComponent = ({ virtualRail, events, selectedDate, onSelectDate, onVisibleMonthChange, scrollViewportRef: externalRef, onScrollTopChange, className }: CalendarListViewProps) => {
  const localRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = externalRef ?? localRef;
  const rail = useMemo(() => virtualRail ?? createRail(selectedDate), [selectedDate, virtualRail]);
  const [range, setRange] = useState<VirtualRange>({ start: 0, end: 1 });
  const rangeRef = useRef(range);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<HTMLDivElement | null>(null);
  const lastSelectedRef = useRef<string | null>(null);
  const lastVisibleRef = useRef<string | null>(null);
  const dates = useMemo(() => buildScheduleVirtualRailDays(rail, range.start, range.end), [rail, range.end, range.start]);
  const days = useMemo(() => buildListDays(dates, events, selectedDate), [dates, events, selectedDate]);
  const totalHeight = Math.max(0, rail.totalDayCount * DAY_BLOCK - LIST_DAY_GAP_PX);

  const setRangeIfChanged = useCallback((next: VirtualRange) => { if (sameRange(rangeRef.current, next)) return; rangeRef.current = next; setRange(next); }, []);
  const updateRange = useCallback((element: HTMLDivElement | null, force = false) => { if (!element) return; if (!force && !shouldRefreshRange(element, rangeRef.current)) return; setRangeIfChanged(getRange(element.scrollTop, element.clientHeight, rail.totalDayCount)); }, [rail.totalDayCount, setRangeIfChanged]);
  const updateVisibleDate = useCallback((element: HTMLDivElement | null) => { if (!element || !onVisibleMonthChange) return; const index = Math.max(0, Math.min(rail.totalDayCount - 1, Math.floor((element.scrollTop + Math.min(ANCHOR_OFFSET, element.clientHeight / 2)) / DAY_BLOCK))); const date = getScheduleVirtualRailDate(rail, index); if (!date) return; const key = getCalendarDateKey(date); if (lastVisibleRef.current === key) return; lastVisibleRef.current = key; onVisibleMonthChange(date); }, [onVisibleMonthChange, rail]);
  const scheduleScrollWork = useCallback((element: HTMLDivElement) => { pendingRef.current = element; if (frameRef.current !== null) return; frameRef.current = window.requestAnimationFrame(() => { frameRef.current = null; const pending = pendingRef.current; pendingRef.current = null; if (!pending) return; updateRange(pending); updateVisibleDate(pending); onScrollTopChange?.(pending.scrollTop); }); }, [onScrollTopChange, updateRange, updateVisibleDate]);

  useLayoutEffect(() => { updateRange(scrollRef.current, true); }, [scrollRef, updateRange]);
  useEffect(() => { const element = scrollRef.current; if (!element) return; const handleScroll = () => scheduleScrollWork(element); element.addEventListener("scroll", handleScroll, { passive: true }); return () => element.removeEventListener("scroll", handleScroll); }, [scheduleScrollWork, scrollRef]);
  useEffect(() => { const element = scrollRef.current; const key = getCalendarDateKey(selectedDate); const index = getIndexForDate(rail, selectedDate); if (lastSelectedRef.current === key || !element || index < 0 || index >= rail.totalDayCount) return; lastSelectedRef.current = key; element.scrollTop = Math.max(0, index * DAY_BLOCK - SELECTED_OFFSET); updateRange(element, true); }, [rail, scrollRef, selectedDate, updateRange]);
  useEffect(() => () => { if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current); }, []);

  return <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-white", className)}><div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2 scrollbar-hidden"><div className="mx-auto w-full max-w-[940px]"><div className="relative w-full" style={{ height: totalHeight }}>{days.map((day, offset) => <div key={day.dateKey} className="absolute left-0 right-0" style={{ contain: "layout style", top: (range.start + offset) * DAY_BLOCK, height: LIST_DAY_SECTION_MIN_HEIGHT_PX }}><CalendarListDaySection day={day} onSelectDate={onSelectDate} /></div>)}</div></div></div></div>;
};

const CalendarListView = memo(CalendarListViewComponent);

CalendarListView.displayName = "CalendarListView";

export { CalendarListView };
