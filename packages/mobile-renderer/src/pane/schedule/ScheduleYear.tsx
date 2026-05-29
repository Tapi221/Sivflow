import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addYears, eachMonthOfInterval, endOfYear, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from "react-native";
import { getCalendarDateKey, getEventDateKeys } from "@core/calendar/calendarEventRange";
import type { CalendarEvent } from "@core/calendar/calendarEvent.types";

type ScheduleYearProps = {
  yearDate: Date;
  selectedDate: Date;
  visibleEvents?: CalendarEvent[];
  onSelectDate: (date: Date) => void;
  onRenderedRangeChange?: (range: { start: Date; end: Date }) => void;
};

type ScheduleYearDayEvents = {
  count: number;
  color: string;
};

type ScheduleYearDay = {
  date: Date;
  key: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  events: ScheduleYearDayEvents | null;
};

type ScheduleYearMonth = {
  key: string;
  date: Date;
  label: string;
  weeks: ScheduleYearDay[][];
};

type ScheduleYearBlock = {
  key: string;
  date: Date;
  label: string;
  months: ScheduleYearMonth[];
};

const YEAR_MONTH_GRID_DAY_COUNT = 42;
const INITIAL_YEAR_BUFFER = 1;
const YEAR_EXTEND_COUNT = 1;
const YEAR_MAX_RENDERED_YEARS = 5;
const YEAR_SCROLL_EDGE_THRESHOLD_PX = 240;
const EVENT_DAY_BACKGROUND_ALPHA = 0.16;
const MONTH_COLUMNS = 3;
const MONTH_CELL_SIZE = 24;
const MONTH_WEEKDAY_HEIGHT = 20;
const YEAR_SECTION_GAP = 32;
const MINI_CALENDAR_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;
const MONTH_LABEL_FORMAT = "M月";
const YEAR_LABEL_FORMAT = "yyyy年";

const normalizeColor = (color: string): string => {
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const red = color.charAt(1);
    const green = color.charAt(2);
    const blue = color.charAt(3);

    return `#${red}${red}${green}${green}${blue}${blue}`;
  }

  return color;
};

const colorToRgba = (color: string, alpha: number): string => {
  const normalized = normalizeColor(color);
  const match = /^#([0-9a-f]{6})$/i.exec(normalized);

  if (!match) return color;

  const value = match[1];
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const buildEventsByDay = (events: CalendarEvent[]): Map<string, ScheduleYearDayEvents> => {
  const eventsByDay = new Map<string, ScheduleYearDayEvents>();

  for (const event of events) {
    for (const dayKey of getEventDateKeys(event)) {
      const current = eventsByDay.get(dayKey);

      if (current) {
        current.count += 1;
      } else {
        eventsByDay.set(dayKey, {
          count: 1,
          color: event.accentColor,
        });
      }
    }
  }

  return eventsByDay;
};

const buildMonthDays = (monthDate: Date, eventsByDay: Map<string, ScheduleYearDayEvents>): ScheduleYearDay[] => {
  const monthStart = startOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });

  return Array.from({ length: YEAR_MONTH_GRID_DAY_COUNT }, (_, index) => {
    const date = addDays(gridStart, index);
    const key = getCalendarDateKey(date);

    return {
      date,
      key,
      dayOfMonth: date.getDate(),
      isCurrentMonth: isSameMonth(date, monthStart),
      events: eventsByDay.get(key) ?? null,
    };
  });
};

const chunkMonthWeeks = (days: ScheduleYearDay[]): ScheduleYearDay[][] => {
  const weeks: ScheduleYearDay[][] = [];

  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return weeks;
};

const getDayButtonStyle = (day: ScheduleYearDay, selected: boolean): ViewStyle | undefined => {
  if (selected || !day.events) return undefined;

  return {
    backgroundColor: colorToRgba(day.events.color, EVENT_DAY_BACKGROUND_ALPHA),
  };
};

const getYearRange = (anchorYear: Date, startOffset: number, endOffset: number): { start: Date; end: Date } => ({
  start: startOfYear(addYears(anchorYear, startOffset)),
  end: endOfYear(addYears(anchorYear, endOffset)),
});

const getMonthItemStyle = (monthIndex: number): ViewStyle => ({
  marginTop: monthIndex < MONTH_COLUMNS ? 0 : 16,
  width: `${100 / MONTH_COLUMNS}%`,
});

const ScheduleYearComponent = ({ yearDate, selectedDate, visibleEvents = [], onSelectDate, onRenderedRangeChange }: ScheduleYearProps) => {
  const today = useMemo(() => new Date(), []);
  const [anchorYear, setAnchorYear] = useState(() => startOfYear(yearDate));
  const [yearOffsetRange, setYearOffsetRange] = useState(() => ({
    startOffset: -INITIAL_YEAR_BUFFER,
    endOffset: INITIAL_YEAR_BUFFER,
  }));

  const eventsByDay = useMemo(() => buildEventsByDay(visibleEvents), [visibleEvents]);
  const years = useMemo<ScheduleYearBlock[]>(() => {
    const yearCount = Math.max(0, yearOffsetRange.endOffset - yearOffsetRange.startOffset + 1);

    return Array.from({ length: yearCount }, (_, index) => {
      const date = startOfYear(addYears(anchorYear, yearOffsetRange.startOffset + index));
      const months = eachMonthOfInterval({
        start: startOfYear(date),
        end: endOfYear(date),
      }).map((monthDate) => {
        const days = buildMonthDays(monthDate, eventsByDay);

        return {
          key: format(monthDate, "yyyy-MM"),
          date: monthDate,
          label: format(monthDate, MONTH_LABEL_FORMAT),
          weeks: chunkMonthWeeks(days),
        };
      });

      return {
        key: format(date, "yyyy"),
        date,
        label: format(date, YEAR_LABEL_FORMAT),
        months,
      };
    });
  }, [anchorYear, eventsByDay, yearOffsetRange.endOffset, yearOffsetRange.startOffset]);
  const renderedRange = useMemo(() => getYearRange(anchorYear, yearOffsetRange.startOffset, yearOffsetRange.endOffset), [anchorYear, yearOffsetRange.endOffset, yearOffsetRange.startOffset]);

  useEffect(() => {
    setAnchorYear(startOfYear(yearDate));
    setYearOffsetRange({
      startOffset: -INITIAL_YEAR_BUFFER,
      endOffset: INITIAL_YEAR_BUFFER,
    });
  }, [yearDate]);

  useEffect(() => {
    onRenderedRangeChange?.(renderedRange);
  }, [onRenderedRangeChange, renderedRange]);

  const extendBefore = useCallback(() => {
    setYearOffsetRange((currentRange) => {
      const shouldTrimAfter = currentRange.endOffset - currentRange.startOffset + 1 + YEAR_EXTEND_COUNT > YEAR_MAX_RENDERED_YEARS;

      return {
        startOffset: currentRange.startOffset - YEAR_EXTEND_COUNT,
        endOffset: shouldTrimAfter ? currentRange.endOffset - YEAR_EXTEND_COUNT : currentRange.endOffset,
      };
    });
  }, []);

  const extendAfter = useCallback(() => {
    setYearOffsetRange((currentRange) => {
      const shouldTrimBefore = currentRange.endOffset - currentRange.startOffset + 1 + YEAR_EXTEND_COUNT > YEAR_MAX_RENDERED_YEARS;

      return {
        startOffset: shouldTrimBefore ? currentRange.startOffset + YEAR_EXTEND_COUNT : currentRange.startOffset,
        endOffset: currentRange.endOffset + YEAR_EXTEND_COUNT,
      };
    });
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceToBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;

    if (contentSize.height <= layoutMeasurement.height) return;

    if (contentOffset.y > 0 && contentOffset.y < YEAR_SCROLL_EDGE_THRESHOLD_PX) {
      extendBefore();
      return;
    }

    if (distanceToBottom > 0 && distanceToBottom < YEAR_SCROLL_EDGE_THRESHOLD_PX) {
      extendAfter();
    }
  }, [extendAfter, extendBefore]);

  return (
    <ScrollView contentContainerStyle={styles.content} onScroll={handleScroll} scrollEventThrottle={180} showsVerticalScrollIndicator={false} style={styles.root}>
      {years.map((year) => (
        <View key={year.key} accessibilityLabel={year.label} style={styles.yearSection}>
          <Text style={styles.yearLabel}>{year.label}</Text>
          <View style={styles.monthGrid}>
            {year.months.map((month, monthIndex) => (
              <View key={month.key} accessibilityLabel={month.label} style={[styles.monthItem, getMonthItemStyle(monthIndex)]}>
                <Text style={styles.monthLabel}>{month.label}</Text>
                <View style={styles.weekdayRow}>
                  {MINI_CALENDAR_WEEKDAYS.map((weekday, index) => (
                    <Text key={`${month.key}-${weekday}-${index}`} style={styles.weekdayText}>
                      {weekday}
                    </Text>
                  ))}
                </View>
                <View style={styles.daysGrid}>
                  {month.weeks.flat().map((day) => {
                    const selected = isSameDay(day.date, selectedDate);
                    const isToday = isSameDay(day.date, today);
                    const eventCount = day.events?.count ?? 0;

                    return (
                      <Pressable key={day.key} accessibilityLabel={`${day.date.getFullYear()}年${day.date.getMonth() + 1}月${day.date.getDate()}日${eventCount > 0 ? `、予定${eventCount}件` : ""}`} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onSelectDate(day.date)} style={[styles.dayButton, getDayButtonStyle(day, selected), selected && styles.selectedDayButton]}>
                        <Text style={[styles.dayText, !day.isCurrentMonth && styles.outsideMonthDayText, isToday && !selected && styles.todayDayText, selected && styles.selectedDayText]}>
                          {day.dayOfMonth}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: YEAR_SECTION_GAP,
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dayButton: {
    alignItems: "center",
    borderRadius: MONTH_CELL_SIZE / 2,
    height: MONTH_CELL_SIZE,
    justifyContent: "center",
    width: MONTH_CELL_SIZE,
  },
  dayText: {
    color: "#5f6672",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  daysGrid: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    marginTop: 4,
    width: MONTH_CELL_SIZE * 7,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -16,
  },
  monthItem: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  monthLabel: {
    alignSelf: "flex-start",
    color: "#1c1c1e",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.15,
    lineHeight: 18,
    marginBottom: 12,
  },
  outsideMonthDayText: {
    color: "#b8b8bd",
  },
  root: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    flex: 1,
  },
  selectedDayButton: {
    backgroundColor: "#3478f6",
    shadowColor: "#3478f6",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  selectedDayText: {
    color: "#ffffff",
  },
  todayDayText: {
    color: "#3478f6",
  },
  weekdayRow: {
    flexDirection: "row",
    height: MONTH_WEEKDAY_HEIGHT,
    width: MONTH_CELL_SIZE * 7,
  },
  weekdayText: {
    color: "#8e8e93",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: MONTH_WEEKDAY_HEIGHT,
    textAlign: "center",
    width: MONTH_CELL_SIZE,
  },
  yearLabel: {
    color: "#1c1c1e",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.17,
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  yearSection: {
    backgroundColor: "#ffffff",
    minWidth: 0,
  },
});

const ScheduleYear = memo(ScheduleYearComponent);

ScheduleYear.displayName = "ScheduleYear";

export { ScheduleYear };
export type { ScheduleYearProps };