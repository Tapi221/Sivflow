import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CalendarEvent } from "@core/calendar";


type CalendarWeekStartDay = "sunday" | "monday";
type ScheduleYearProps = {
  yearDate: Date;
  selectedDate: Date;
  weekStartDay?: CalendarWeekStartDay;
  visibleEvents?: CalendarEvent[];
  onSelectDate: (date: Date) => void;
  onRenderedRangeChange?: (range: { start: Date; end: Date; }) => void;
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#fff",
    flex: 1,
    padding: 16,
  },
  label: {
    color: "#1c1c1e",
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 22,
  },
  subLabel: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});

const formatYear = (date: Date) => `${date.getFullYear()}年`;
const formatSelectedDate = (date: Date) => `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

const ScheduleYearComponent = ({ yearDate, selectedDate, visibleEvents = [], onSelectDate }: ScheduleYearProps) => {
  return (
    <View style={styles.root}>
      <Pressable accessibilityRole="button" onPress={() => onSelectDate(selectedDate)}>
        <Text style={styles.label}>{formatYear(yearDate)}</Text>
        <Text style={styles.subLabel}>選択中: {formatSelectedDate(selectedDate)}</Text>
        <Text style={styles.subLabel}>予定: {visibleEvents.length}件</Text>
      </Pressable>
    </View>
  );
};

const ScheduleYear = memo(ScheduleYearComponent);
ScheduleYear.displayName = "ScheduleYear";

export { ScheduleYear };
export type { ScheduleYearProps };
