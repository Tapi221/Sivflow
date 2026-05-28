import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addYears, eachMonthOfInterval, endOfYear, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from "react-native";
import { getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { useDateFnsLocale, useT } from "@/i18n/useT";

type ScheduleYearMobileNativeProps = {
  yearDate: Date;
  selectedDate: Date;
  visibleEvents?: GoogleCalendarEvent[];
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
const YEAR_SCROLL_EDGE_THRESHOLD_PX = 900;
const EVENT_DAY_BACKGROUND_ALPHA = 0.18;
const MONTH_COLUMNS = 3;
const MONTH_CELL_SIZE = 24;
const MONTH_WEEKDAY_HEIGHT = 18;
const YEAR_SECTION_GAP = 28;

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

const buildEventsByDay = (events: GoogleCalendarEvent[]): Map<string, ScheduleYearDayEvents> => {
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
  marginTop: monthIndex < MONTH_COLUMNS ? 0 : 26,
  width: `${100 / MONTH_COLUMNS}%`,
});

const ScheduleYearMobileNativeComponent = ({ yearDate, selectedDate, visibleEvents = [], onSelectDate, onRenderedRangeChange }: ScheduleYearMobileNativeProps) => {
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
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
          label: format(monthDate, t.dateFnsLocaleKey === "ja" ? "M月" : "MMM", { locale: dateFnsLocale }),
          weeks: chunkMonthWeeks(days),
        };
      });

      return {
        key: format(date, "yyyy"),
        date,
        label: format(date, "yyyy", { locale: dateFnsLocale }),
        months,
      };
    });
  }, [anchorYear, dateFnsLocale, eventsByDay, t.dateFnsLocaleKey, yearOffsetRange.endOffset, yearOffsetRange.startOffset]);

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

    if (contentOffset.y < YEAR_SCROLL_EDGE_THRESHOLD_PX) {
      extendBefore();
      return;
    }

    if (distanceToBottom < YEAR_SCROLL_EDGE_THRESHOLD_PX) {
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
                  {t.miniCalendarWeekdays.map((weekday, index) => (
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
    paddingBottom: 36,
    paddingHorizontal: 26,
    paddingTop: 22,
  },
  dayButton: {
    alignItems: "center",
    borderRadius: MONTH_CELL_SIZE / 2,
    height: MONTH_CELL_SIZE,
    justifyContent: "center",
    width: MONTH_CELL_SIZE,
  },
  dayText: {
    color: "#33343A",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.2,
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
    marginHorizontal: -6,
  },
  monthItem: {
    alignItems: "center",
    paddingHorizontal: 6,
  },
  monthLabel: {
    alignSelf: "flex-start",
    color: "#222329",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 34,
    marginBottom: 12,
    paddingLeft: 1,
  },
  outsideMonthDayText: {
    color: "#C7C8CE",
  },
  root: {
    backgroundColor: "#F7F6FA",
    flex: 1,
  },
  selectedDayButton: {
    backgroundColor: "#8A7DDB",
    shadowColor: "#8174D7",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  selectedDayText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  todayDayText: {
    color: "#7F72D6",
    fontWeight: "700",
  },
  weekdayRow: {
    flexDirection: "row",
    height: MONTH_WEEKDAY_HEIGHT,
    width: MONTH_CELL_SIZE * 7,
  },
  weekdayText: {
    color: "#7F818A",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: MONTH_WEEKDAY_HEIGHT,
    textAlign: "center",
    width: MONTH_CELL_SIZE,
  },
  yearLabel: {
    color: "#202126",
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: -2,
    lineHeight: 58,
    marginBottom: 22,
  },
  yearSection: {
    borderBottomColor: "rgba(142, 144, 152, 0.22)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 24,
  },
});

const ScheduleYearMobileNative = memo(ScheduleYearMobileNativeComponent);

ScheduleYearMobileNative.displayName = "ScheduleYearMobileNative";

export { ScheduleYearMobileNative };
export type { ScheduleYearMobileNativeProps };
