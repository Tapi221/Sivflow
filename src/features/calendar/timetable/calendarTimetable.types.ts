import type { TagColorKey } from "@/chip/tag/tag.types";

export type CalendarTimetableWeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type CalendarTimetableVisibleDayCount = 5 | 6 | 7;

export type CalendarTimetablePeriod = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  order: number;
};

export type CalendarTimetableSlot = {
  dayIndex: CalendarTimetableWeekdayIndex;
  periodId: string;
};

export type CalendarTimetableCourse = {
  id: string;
  semesterId: string;
  title: string;
  room: string;
  teacher: string;
  memo: string;
  colorKey: TagColorKey;
  slots: CalendarTimetableSlot[];
  createdAt: string;
  updatedAt: string;
};

export type CalendarTimetableCourseDraft = {
  id?: string;
  semesterId: string;
  title: string;
  room: string;
  teacher: string;
  memo: string;
  colorKey: TagColorKey;
  slots: CalendarTimetableSlot[];
  createdAt?: string;
};

export type CalendarTimetableSettings = {
  id: string;
  activeSemesterId: string;
  visibleDayCount: CalendarTimetableVisibleDayCount;
  updatedAt: string;
};
