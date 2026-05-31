import type { CalendarEvent } from "./calendarEvent.types";

export type CalendarTimeGridLayoutMode = "overlap" | "no-overlap";

export type CalendarTimeGridStyle = {
  top: number;
  height: number;
  width: number;
  xOffset: number;
};

export type CalendarTimeGridLayoutEntry = {
  event: CalendarEvent;
  style: CalendarTimeGridStyle;
  startsBeforeRange: boolean;
  endsAfterRange: boolean;
  columnIndex?: number;
  columnCount?: number;
};

export type CalendarTimeGridLayoutOptions = {
  events: readonly CalendarEvent[];
  rangeStart: Date;
  rangeEnd: Date;
  layoutMode?: CalendarTimeGridLayoutMode;
  includeAllDayEvents?: boolean;
  minimumEventDurationMinutes?: number;
  minimumStartDifferenceMinutes?: number;
};

type TimeGridLayoutProxy = {
  event: CalendarEvent;
  start: number;
  end: number;
  startMs: number;
  endMs: number;
  top: number;
  height: number;
  startsBeforeRange: boolean;
  endsAfterRange: boolean;
  container?: TimeGridLayoutProxy;
  rows?: TimeGridLayoutProxy[];
  row?: TimeGridLayoutProxy;
  leaves?: TimeGridLayoutProxy[];
};

type TimeGridLayoutContainerProxy = TimeGridLayoutProxy & {
  rows: TimeGridLayoutProxy[];
};

type NoOverlapLayoutEntry = CalendarTimeGridLayoutEntry & {
  friends: NoOverlapLayoutEntry[];
  idx?: number;
  size?: number;
};

const DEFAULT_MINIMUM_EVENT_DURATION_MINUTES = 30;
const DEFAULT_MINIMUM_START_DIFFERENCE_MINUTES = 30;
const MINUTES_IN_MS = 60_000;
const PERCENT_MAX = 100;

const getDateTime = (date: Date): number => date instanceof Date ? date.getTime() : Number.NaN;

const isFiniteTime = (value: number): boolean => Number.isFinite(value);

const compareText = (a: string, b: string): number => {
  if (a < b) return -1;
  if (a > b) return 1;

  return 0;
};

const compareEventsForLayout = (a: CalendarEvent, b: CalendarEvent): number => {
  const startDiff = getDateTime(a.startsAt) - getDateTime(b.startsAt);

  if (startDiff !== 0) return startDiff;

  const endDiff = getDateTime(b.endsAt) - getDateTime(a.endsAt);

  if (endDiff !== 0) return endDiff;

  const titleDiff = compareText(a.title, b.title);

  if (titleDiff !== 0) return titleDiff;

  return compareText(`${a.calendarId}:${a.id}`, `${b.calendarId}:${b.id}`);
};

const createTimeGridProxy = ({
  event,
  rangeStartMs,
  rangeEndMs,
  minimumEventDurationMinutes,
}: {
  event: CalendarEvent;
  rangeStartMs: number;
  rangeEndMs: number;
  minimumEventDurationMinutes: number;
}): TimeGridLayoutProxy | null => {
  const rawStartMs = getDateTime(event.startsAt);
  const rawEndMs = getDateTime(event.endsAt);

  if (!isFiniteTime(rawStartMs) || !isFiniteTime(rawEndMs)) return null;

  const minimumDurationMs = Math.max(1, minimumEventDurationMinutes) * MINUTES_IN_MS;
  const normalizedEndMs = Math.max(rawEndMs, rawStartMs + minimumDurationMs);

  if (rawStartMs >= rangeEndMs || normalizedEndMs <= rangeStartMs) return null;

  const clippedStartMs = Math.max(rawStartMs, rangeStartMs);
  const clippedEndMs = Math.min(normalizedEndMs, rangeEndMs);
  const totalRangeMs = rangeEndMs - rangeStartMs;
  const top = ((clippedStartMs - rangeStartMs) / totalRangeMs) * PERCENT_MAX;
  const height = ((clippedEndMs - clippedStartMs) / totalRangeMs) * PERCENT_MAX;

  return {
    event,
    start: (clippedStartMs - rangeStartMs) / MINUTES_IN_MS,
    end: (clippedEndMs - rangeStartMs) / MINUTES_IN_MS,
    startMs: clippedStartMs,
    endMs: clippedEndMs,
    top,
    height,
    startsBeforeRange: rawStartMs < rangeStartMs,
    endsAfterRange: normalizedEndMs > rangeEndMs,
  };
};

const sortByRenderOrder = (events: TimeGridLayoutProxy[]): TimeGridLayoutProxy[] => {
  const sortedByTime = [...events].sort((a, b) => {
    const startDiff = a.startMs - b.startMs;

    if (startDiff !== 0) return startDiff;

    return b.endMs - a.endMs;
  });
  const sorted: TimeGridLayoutProxy[] = [];

  while (sortedByTime.length > 0) {
    const event = sortedByTime.shift();

    if (!event) break;

    sorted.push(event);

    for (let index = 0; index < sortedByTime.length; index += 1) {
      const test = sortedByTime[index];

      if (event.endMs > test.startMs) continue;

      if (index > 0) {
        const nextEvent = sortedByTime.splice(index, 1)[0];

        if (nextEvent) sorted.push(nextEvent);
      }

      break;
    }
  }

  return sorted;
};

const isOnSameRow = (
  a: TimeGridLayoutProxy,
  b: TimeGridLayoutProxy,
  minimumStartDifferenceMinutes: number,
): boolean =>
  Math.abs(b.start - a.start) < minimumStartDifferenceMinutes ||
  (b.start > a.start && b.start < a.end);

const getBaseWidth = (event: TimeGridLayoutProxy): number => {
  if (event.rows) {
    const columns = event.rows.reduce((max, row) => Math.max(max, (row.leaves?.length ?? 0) + 1), 0) + 1;

    return PERCENT_MAX / columns;
  }

  if (event.leaves) {
    const containerWidth = event.container ? getBaseWidth(event.container) : 0;
    const availableWidth = PERCENT_MAX - containerWidth;

    return availableWidth / (event.leaves.length + 1);
  }

  return event.row ? getBaseWidth(event.row) : PERCENT_MAX;
};

const getRenderWidth = (event: TimeGridLayoutProxy): number => {
  const noOverlapWidth = getBaseWidth(event);
  const overlapWidth = Math.min(PERCENT_MAX, noOverlapWidth * 1.7);

  if (event.rows) return overlapWidth;

  if (event.leaves) return event.leaves.length > 0 ? overlapWidth : noOverlapWidth;

  const leaves = event.row?.leaves ?? [];
  const index = leaves.indexOf(event);

  return index === leaves.length - 1 ? noOverlapWidth : overlapWidth;
};

const getXOffset = (event: TimeGridLayoutProxy): number => {
  if (event.rows) return 0;

  if (event.leaves) return event.container ? getBaseWidth(event.container) : 0;

  const row = event.row;

  if (!row) return 0;

  const leaves = row.leaves ?? [];
  const index = leaves.indexOf(event) + 1;

  return getXOffset(row) + index * getBaseWidth(row);
};

const mapProxyToLayoutEntry = (event: TimeGridLayoutProxy): CalendarTimeGridLayoutEntry => ({
  event: event.event,
  style: {
    top: event.top,
    height: event.height,
    width: getRenderWidth(event),
    xOffset: Math.max(0, getXOffset(event)),
  },
  startsBeforeRange: event.startsBeforeRange,
  endsAfterRange: event.endsAfterRange,
});

const layoutOverlapEvents = ({
  proxies,
  minimumStartDifferenceMinutes,
}: {
  proxies: TimeGridLayoutProxy[];
  minimumStartDifferenceMinutes: number;
}): CalendarTimeGridLayoutEntry[] => {
  const eventsInRenderOrder = sortByRenderOrder(proxies);
  const containerEvents: TimeGridLayoutContainerProxy[] = [];

  for (const event of eventsInRenderOrder) {
    const container = containerEvents.find(
      (candidate) =>
        candidate.end > event.start ||
        Math.abs(event.start - candidate.start) < minimumStartDifferenceMinutes,
    );

    if (!container) {
      const nextContainer: TimeGridLayoutContainerProxy = Object.assign(event, { rows: [] });
      containerEvents.push(nextContainer);
      continue;
    }

    event.container = container;

    let row: TimeGridLayoutProxy | null = null;

    for (let index = container.rows.length - 1; !row && index >= 0; index -= 1) {
      const candidate = container.rows[index];

      if (isOnSameRow(candidate, event, minimumStartDifferenceMinutes)) {
        row = candidate;
      }
    }

    if (row) {
      row.leaves?.push(event);
      event.row = row;
    } else {
      event.leaves = [];
      container.rows.push(event);
    }
  }

  return eventsInRenderOrder.map(mapProxyToLayoutEntry);
};

const timeGridEntriesOverlap = (
  a: CalendarTimeGridLayoutEntry,
  b: CalendarTimeGridLayoutEntry,
): boolean => {
  const aStart = a.style.top;
  const aEnd = a.style.top + a.style.height;
  const bStart = b.style.top;
  const bEnd = b.style.top + b.style.height;

  return (
    (bStart >= aStart && bEnd <= aEnd) ||
    (bEnd > aStart && bEnd <= aEnd) ||
    (bStart >= aStart && bStart < aEnd)
  );
};

const collectMaxColumnIndex = (
  node: NoOverlapLayoutEntry,
  visited: Set<NoOverlapLayoutEntry>,
): number => {
  if (visited.has(node)) return node.idx ?? 0;

  visited.add(node);

  let maxIndex = node.idx ?? 0;

  for (const friend of node.friends) {
    maxIndex = Math.max(maxIndex, collectMaxColumnIndex(friend, visited));
  }

  return maxIndex;
};

const assignNoOverlapColumns = (entries: NoOverlapLayoutEntry[]): NoOverlapLayoutEntry[] => {
  for (const entry of entries) {
    const usedIndexes = new Set(
      entry.friends.map((friend) => friend.idx).filter((idx): idx is number => idx !== undefined),
    );
    let idx = 0;

    while (usedIndexes.has(idx)) idx += 1;

    entry.idx = idx;
  }

  for (const entry of entries) {
    if (entry.size !== undefined) continue;

    const group = new Set<NoOverlapLayoutEntry>();
    const maxIndex = collectMaxColumnIndex(entry, group);
    const size = PERCENT_MAX / (maxIndex + 1);

    for (const groupEntry of group) {
      groupEntry.size = size;
    }
  }

  return entries;
};

const layoutNoOverlapEvents = ({
  proxies,
  minimumStartDifferenceMinutes,
}: {
  proxies: TimeGridLayoutProxy[];
  minimumStartDifferenceMinutes: number;
}): CalendarTimeGridLayoutEntry[] => {
  const entries: NoOverlapLayoutEntry[] = layoutOverlapEvents({
    proxies,
    minimumStartDifferenceMinutes,
  })
    .map((entry) => ({ ...entry, friends: [] }))
    .sort((a, b) => {
      if (a.style.top !== b.style.top) return a.style.top > b.style.top ? 1 : -1;

      if (a.style.height !== b.style.height) {
        return a.style.top + a.style.height < b.style.top + b.style.height ? 1 : -1;
      }

      return compareEventsForLayout(a.event, b.event);
    });

  for (let index = 0; index < entries.length - 1; index += 1) {
    const entry = entries[index];

    for (let nextIndex = index + 1; nextIndex < entries.length; nextIndex += 1) {
      const nextEntry = entries[nextIndex];

      if (!timeGridEntriesOverlap(entry, nextEntry)) continue;

      entry.friends.push(nextEntry);
      nextEntry.friends.push(entry);
    }
  }

  assignNoOverlapColumns(entries);

  return entries.map((entry): CalendarTimeGridLayoutEntry => {
    const idx = entry.idx ?? 0;
    const baseSize = entry.size ?? PERCENT_MAX;
    const left = idx * baseSize;
    const maxFriendIndex = entry.friends.reduce((max, friend) => Math.max(max, friend.idx ?? 0), 0);
    const width = maxFriendIndex <= idx ? PERCENT_MAX - left : baseSize;
    const columnCount = Math.max(1, Math.round(PERCENT_MAX / baseSize));

    return {
      event: entry.event,
      style: {
        ...entry.style,
        width,
        xOffset: left,
      },
      startsBeforeRange: entry.startsBeforeRange,
      endsAfterRange: entry.endsAfterRange,
      columnIndex: idx,
      columnCount,
    };
  });
};

export const layoutCalendarTimeGridEvents = ({
  events,
  rangeStart,
  rangeEnd,
  layoutMode = "overlap",
  includeAllDayEvents = false,
  minimumEventDurationMinutes = DEFAULT_MINIMUM_EVENT_DURATION_MINUTES,
  minimumStartDifferenceMinutes = DEFAULT_MINIMUM_START_DIFFERENCE_MINUTES,
}: CalendarTimeGridLayoutOptions): CalendarTimeGridLayoutEntry[] => {
  const rangeStartMs = getDateTime(rangeStart);
  const rangeEndMs = getDateTime(rangeEnd);

  if (!isFiniteTime(rangeStartMs) || !isFiniteTime(rangeEndMs)) return [];
  if (rangeEndMs <= rangeStartMs) return [];

  const proxies = events
    .filter((event) => includeAllDayEvents || !event.isAllDay)
    .sort(compareEventsForLayout)
    .map((event) =>
      createTimeGridProxy({
        event,
        rangeStartMs,
        rangeEndMs,
        minimumEventDurationMinutes,
      }),
    )
    .filter((proxy): proxy is TimeGridLayoutProxy => proxy !== null);

  if (layoutMode === "no-overlap") {
    return layoutNoOverlapEvents({ proxies, minimumStartDifferenceMinutes });
  }

  return layoutOverlapEvents({ proxies, minimumStartDifferenceMinutes });
};
