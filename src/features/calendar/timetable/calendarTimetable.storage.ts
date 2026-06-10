import Dexie, { type Table } from "dexie";
import type { CalendarTimetableCourse, CalendarTimetableCourseDraft, CalendarTimetablePeriod, CalendarTimetableSettings, CalendarTimetableSlot, CalendarTimetableVisibleDayCount, CalendarTimetableWeekdayIndex } from "./calendarTimetable.types";

class CalendarTimetableDatabase extends Dexie {
  courses!: Table<CalendarTimetableCourse, string>;
  periods!: Table<CalendarTimetablePeriod, string>;
  settings!: Table<CalendarTimetableSettings, string>;

  constructor() {
    super("sivflow-calendar-timetable");
    this.version(1).stores({
      courses: "id, semesterId, updatedAt",
      periods: "id, order",
      settings: "id",
    });
  }
}

const TIMETABLE_SETTINGS_ID = "default";
const DEFAULT_SEMESTER_ID = "default-semester";
const DEFAULT_VISIBLE_DAY_COUNT: CalendarTimetableVisibleDayCount = 5;
const DEFAULT_TIMETABLE_PERIODS: readonly CalendarTimetablePeriod[] = [
  { id: "period-1", label: "1", startTime: "08:50", endTime: "10:20", order: 0 },
  { id: "period-2", label: "2", startTime: "10:30", endTime: "12:00", order: 1 },
  { id: "period-3", label: "3", startTime: "13:00", endTime: "14:30", order: 2 },
  { id: "period-4", label: "4", startTime: "14:40", endTime: "16:10", order: 3 },
  { id: "period-5", label: "5", startTime: "16:20", endTime: "17:50", order: 4 },
  { id: "period-6", label: "6", startTime: "18:00", endTime: "19:30", order: 5 },
  { id: "period-7", label: "7", startTime: "19:40", endTime: "21:10", order: 6 },
];

const timetableDb = new CalendarTimetableDatabase();

const createTimestamp = (): string => new Date().toISOString();

const createCourseId = (): string => `course-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createPeriodId = (): string => `period-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createDefaultSettings = (): CalendarTimetableSettings => ({ id: TIMETABLE_SETTINGS_ID, activeSemesterId: DEFAULT_SEMESTER_ID, visibleDayCount: DEFAULT_VISIBLE_DAY_COUNT, updatedAt: createTimestamp() });

const isValidWeekdayIndex = (value: number): value is CalendarTimetableWeekdayIndex => Number.isInteger(value) && value >= 0 && value <= 6;

const normalizeVisibleDayCount = (value: number): CalendarTimetableVisibleDayCount => value <= 5 ? 5 : value === 6 ? 6 : 7;

const normalizeSlot = (slot: CalendarTimetableSlot, periodIds: Set<string>): CalendarTimetableSlot | null => {
  if (!isValidWeekdayIndex(slot.dayIndex) || !periodIds.has(slot.periodId)) return null;
  return { dayIndex: slot.dayIndex, periodId: slot.periodId };
};

const normalizeSlots = (slots: CalendarTimetableSlot[], periods: CalendarTimetablePeriod[]): CalendarTimetableSlot[] => {
  const periodIds = new Set(periods.map((period) => period.id));
  const seenKeys = new Set<string>();
  const normalizedSlots: CalendarTimetableSlot[] = [];

  slots.forEach((slot) => {
    const normalizedSlot = normalizeSlot(slot, periodIds);
    if (!normalizedSlot) return;

    const key = `${normalizedSlot.dayIndex}:${normalizedSlot.periodId}`;
    if (seenKeys.has(key)) return;

    seenKeys.add(key);
    normalizedSlots.push(normalizedSlot);
  });

  return normalizedSlots;
};

const sortPeriods = (periods: CalendarTimetablePeriod[]): CalendarTimetablePeriod[] => [...periods].sort((left, right) => left.order - right.order);

const ensureCalendarTimetableSeedData = async (): Promise<void> => {
  const [periodCount, settings] = await Promise.all([timetableDb.periods.count(), timetableDb.settings.get(TIMETABLE_SETTINGS_ID)]);

  await timetableDb.transaction("rw", timetableDb.periods, timetableDb.settings, async () => {
    if (periodCount === 0) await timetableDb.periods.bulkPut(DEFAULT_TIMETABLE_PERIODS.map((period) => ({ ...period })));
    if (!settings) await timetableDb.settings.put(createDefaultSettings());
  });
};

const listCalendarTimetablePeriods = async (): Promise<CalendarTimetablePeriod[]> => {
  await ensureCalendarTimetableSeedData();
  return sortPeriods(await timetableDb.periods.toArray());
};

const listCalendarTimetableCourses = async (semesterId: string): Promise<CalendarTimetableCourse[]> => {
  await ensureCalendarTimetableSeedData();
  return timetableDb.courses.where("semesterId").equals(semesterId).sortBy("updatedAt");
};

const getCalendarTimetableSettings = async (): Promise<CalendarTimetableSettings> => {
  await ensureCalendarTimetableSeedData();
  return await timetableDb.settings.get(TIMETABLE_SETTINGS_ID) ?? createDefaultSettings();
};

const saveCalendarTimetableCourse = async (draft: CalendarTimetableCourseDraft): Promise<void> => {
  const periods = await listCalendarTimetablePeriods();
  const slots = normalizeSlots(draft.slots, periods);
  const title = draft.title.trim();
  const now = createTimestamp();

  if (!title || slots.length === 0) return;

  await timetableDb.courses.put({ id: draft.id ?? createCourseId(), semesterId: draft.semesterId, title, room: draft.room.trim(), teacher: draft.teacher.trim(), memo: draft.memo.trim(), colorKey: draft.colorKey, slots, createdAt: draft.createdAt ?? now, updatedAt: now });
};

const deleteCalendarTimetableCourse = async (courseId: string): Promise<void> => {
  await timetableDb.courses.delete(courseId);
};

const updateCalendarTimetableVisibleDayCount = async (visibleDayCount: CalendarTimetableVisibleDayCount): Promise<void> => {
  const currentSettings = await getCalendarTimetableSettings();
  await timetableDb.settings.put({ ...currentSettings, visibleDayCount, updatedAt: createTimestamp() });
};

const addCalendarTimetablePeriod = async (): Promise<void> => {
  const periods = await listCalendarTimetablePeriods();
  const order = periods.length;
  const previousPeriod = periods.at(-1);
  await timetableDb.periods.add({ id: createPeriodId(), label: `${order + 1}`, startTime: previousPeriod?.endTime ?? "09:00", endTime: previousPeriod?.endTime ?? "10:30", order });
};

const updateCalendarTimetablePeriod = async (period: CalendarTimetablePeriod): Promise<void> => {
  await timetableDb.periods.put({ ...period, label: period.label.trim() || `${period.order + 1}`, startTime: period.startTime.trim(), endTime: period.endTime.trim() });
};

const deleteCalendarTimetablePeriod = async (periodId: string): Promise<void> => {
  await timetableDb.transaction("rw", timetableDb.periods, timetableDb.courses, async () => {
    await timetableDb.periods.delete(periodId);
    const courses = await timetableDb.courses.toArray();
    await Promise.all(courses.map(async (course) => {
      const slots = course.slots.filter((slot) => slot.periodId !== periodId);
      if (slots.length === 0) {
        await timetableDb.courses.delete(course.id);
        return;
      }
      await timetableDb.courses.put({ ...course, slots, updatedAt: createTimestamp() });
    }));
  });
};

export { addCalendarTimetablePeriod, deleteCalendarTimetableCourse, deleteCalendarTimetablePeriod, ensureCalendarTimetableSeedData, getCalendarTimetableSettings, listCalendarTimetableCourses, listCalendarTimetablePeriods, normalizeVisibleDayCount, saveCalendarTimetableCourse, updateCalendarTimetablePeriod, updateCalendarTimetableVisibleDayCount };
