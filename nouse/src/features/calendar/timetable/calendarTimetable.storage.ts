import { createCalendarTimetableSearchText as createSearchText, normalizeCalendarTimetableSlots as normalizeSlots, normalizeCalendarTimetableText as normalizeText, normalizeCalendarTimetableVisibleDayCount as normalizeVisibleDayCount, sortCalendarTimetablePeriods as sortPeriods } from "@core/domain/calendar/timetable/timetable.model";
import type { CalendarTimetableCourse, CalendarTimetableCourseDraft, CalendarTimetableDepartment, CalendarTimetableInstitution, CalendarTimetablePeriod, CalendarTimetableSettings, CalendarTimetableSlot, CalendarTimetableSyllabusCourse, CalendarTimetableSyllabusCourseDisplay, CalendarTimetableSyllabusCourseDraft, CalendarTimetableVisibleDayCount } from "@core/domain/calendar/timetable/timetable.types";
import type { Table } from "dexie";
import Dexie from "dexie";



type CalendarTimetableDatabase = Dexie & {
  courses: Table<CalendarTimetableCourse, string>;
  departments: Table<CalendarTimetableDepartment, string>;
  institutions: Table<CalendarTimetableInstitution, string>;
  periods: Table<CalendarTimetablePeriod, string>;
  settings: Table<CalendarTimetableSettings, string>;
  syllabusCourses: Table<CalendarTimetableSyllabusCourse, string>;
};
type CalendarTimetableSettingsRecord = Partial<CalendarTimetableSettings> | null | undefined;



const TIMETABLE_SETTINGS_ID = "default";
const DEFAULT_SEMESTER_ID = "default-semester";
const DEFAULT_VISIBLE_DAY_COUNT: CalendarTimetableVisibleDayCount = 5;
const DEFAULT_UNTITLED_COURSE_TITLE = "授業";
const DEFAULT_TIMETABLE_PERIODS: readonly CalendarTimetablePeriod[] = [
  { id: "period-1", label: "1", startTime: "08:50", endTime: "10:20", order: 0 },
  { id: "period-2", label: "2", startTime: "10:30", endTime: "12:00", order: 1 },
  { id: "period-3", label: "3", startTime: "13:00", endTime: "14:30", order: 2 },
  { id: "period-4", label: "4", startTime: "14:40", endTime: "16:10", order: 3 },
  { id: "period-5", label: "5", startTime: "16:20", endTime: "17:50", order: 4 },
  { id: "period-6", label: "6", startTime: "18:00", endTime: "19:30", order: 5 },
  { id: "period-7", label: "7", startTime: "19:40", endTime: "21:10", order: 6 },
];
const timetableDb = (() => {
  const database = new Dexie("sivflow-calendar-timetable") as CalendarTimetableDatabase;
  database.version(1).stores({
    courses: "id, semesterId, updatedAt",
    periods: "id, order",
    settings: "id",
  });
  database.version(2).stores({
    courses: "id, semesterId, syllabusCourseId, institutionId, departmentId, updatedAt",
    departments: "id, institutionId, name, facultyName, updatedAt",
    institutions: "id, name, kind, updatedAt",
    periods: "id, order",
    settings: "id",
    syllabusCourses: "id, institutionId, departmentId, title, teacher, semesterLabel, source, updatedAt",
  });
  return database;
})();



const createTimestamp = (): string => new Date().toISOString();
const createCourseId = (): string => `course-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const createDepartmentId = (): string => `department-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const createInstitutionId = (): string => `institution-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const createPeriodId = (): string => `period-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const createSyllabusCourseId = (): string => `syllabus-course-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const createDefaultSettings = (): CalendarTimetableSettings => ({ id: TIMETABLE_SETTINGS_ID, activeSemesterId: DEFAULT_SEMESTER_ID, visibleDayCount: DEFAULT_VISIBLE_DAY_COUNT, updatedAt: createTimestamp() });
const createDefaultPeriods = (): CalendarTimetablePeriod[] => DEFAULT_TIMETABLE_PERIODS.map((period) => ({ ...period }));
const getComparableTimestamp = (value: unknown): string => typeof value === "string" ? value : "";
const getRecordTextValue = (value: unknown): string => typeof value === "string" ? normalizeText(value) : "";
const normalizeSemesterId = (value: unknown): string => getRecordTextValue(value) || DEFAULT_SEMESTER_ID;
const normalizeSettingsVisibleDayCount = (value: unknown): CalendarTimetableVisibleDayCount => typeof value === "number" ? normalizeVisibleDayCount(value) : DEFAULT_VISIBLE_DAY_COUNT;
const normalizeCalendarTimetableSettings = (settings: CalendarTimetableSettingsRecord): CalendarTimetableSettings => ({ id: TIMETABLE_SETTINGS_ID, activeSemesterId: normalizeSemesterId(settings?.activeSemesterId), visibleDayCount: normalizeSettingsVisibleDayCount(settings?.visibleDayCount), updatedAt: getRecordTextValue(settings?.updatedAt) || createTimestamp() });
const hasCalendarTimetableSettingsChanged = (settings: CalendarTimetableSettingsRecord, normalizedSettings: CalendarTimetableSettings): boolean => settings?.id !== normalizedSettings.id || settings?.activeSemesterId !== normalizedSettings.activeSemesterId || settings?.visibleDayCount !== normalizedSettings.visibleDayCount || settings?.updatedAt !== normalizedSettings.updatedAt;
const getCourseSearchText = (course: CalendarTimetableSyllabusCourse): string => course.searchText || createSearchText([course.title, course.teacher, course.room, course.semesterLabel, course.credits, course.memo, course.syllabusUrl]);
const restoreDefaultPeriods = async (): Promise<CalendarTimetablePeriod[]> => {
  const periods = createDefaultPeriods();
  await timetableDb.periods.bulkPut(periods);
  return periods;
};
const findInstitutionByName = async (name: string): Promise<CalendarTimetableInstitution | null> => {
  const normalizedName = normalizeText(name);
  if (!normalizedName) return null;
  return await timetableDb.institutions.filter((institution) => institution.name === normalizedName).first() ?? null;
};
const findDepartmentByName = async (institutionId: string, facultyName: string, name: string): Promise<CalendarTimetableDepartment | null> => {
  const normalizedFacultyName = normalizeText(facultyName);
  const normalizedName = normalizeText(name);
  if (!institutionId || !normalizedName) return null;
  return await timetableDb.departments.filter((department) => department.institutionId === institutionId && department.facultyName === normalizedFacultyName && department.name === normalizedName).first() ?? null;
};
const findPeriodByLabel = (periods: CalendarTimetablePeriod[], label: string): CalendarTimetablePeriod | null => {
  const normalizedLabel = normalizeText(label);
  return periods.find((period) => period.label === normalizedLabel) ?? null;
};
const createCourseSlotsFromSyllabusCourse = (syllabusCourse: CalendarTimetableSyllabusCourse, periods: CalendarTimetablePeriod[]): CalendarTimetableSlot[] => {
  return syllabusCourse.slots.flatMap((slot) => {
    const period = findPeriodByLabel(periods, slot.periodLabel);
    if (!period) return [];
    return [{ dayIndex: slot.dayIndex, periodId: period.id }];
  });
};
const ensureCalendarTimetableSeedData = async (): Promise<void> => {
  await timetableDb.transaction("rw", timetableDb.periods, timetableDb.settings, async () => {
    const [periodCount, settings] = await Promise.all([timetableDb.periods.count(), timetableDb.settings.get(TIMETABLE_SETTINGS_ID)]);
    const normalizedSettings = settings ? normalizeCalendarTimetableSettings(settings) : createDefaultSettings();
    if (periodCount === 0) await restoreDefaultPeriods();
    if (!settings || hasCalendarTimetableSettingsChanged(settings, normalizedSettings)) await timetableDb.settings.put(normalizedSettings);
  });
};
const listCalendarTimetablePeriods = async (): Promise<CalendarTimetablePeriod[]> => {
  await ensureCalendarTimetableSeedData();
  const periods = sortPeriods(await timetableDb.periods.toArray());
  if (periods.length > 0) return periods;
  return sortPeriods(await restoreDefaultPeriods());
};
const listCalendarTimetableCourses = async (semesterId: string): Promise<CalendarTimetableCourse[]> => {
  await ensureCalendarTimetableSeedData();
  return timetableDb.courses.where("semesterId").equals(normalizeSemesterId(semesterId)).sortBy("updatedAt");
};
const getCalendarTimetableSettings = async (): Promise<CalendarTimetableSettings> => {
  await ensureCalendarTimetableSeedData();
  const settings = await timetableDb.settings.get(TIMETABLE_SETTINGS_ID);
  const normalizedSettings = settings ? normalizeCalendarTimetableSettings(settings) : createDefaultSettings();
  if (!settings || hasCalendarTimetableSettingsChanged(settings, normalizedSettings)) await timetableDb.settings.put(normalizedSettings);
  return normalizedSettings;
};
const listCalendarTimetableInstitutions = async (): Promise<CalendarTimetableInstitution[]> => {
  await ensureCalendarTimetableSeedData();
  return timetableDb.institutions.orderBy("name").toArray();
};
const listCalendarTimetableDepartments = async (institutionId: string): Promise<CalendarTimetableDepartment[]> => {
  await ensureCalendarTimetableSeedData();
  if (!institutionId) return [];
  return timetableDb.departments.where("institutionId").equals(institutionId).sortBy("name");
};
const searchCalendarTimetableSyllabusCourses = async (query: string, institutionId?: string | null, departmentId?: string | null): Promise<CalendarTimetableSyllabusCourseDisplay[]> => {
  await ensureCalendarTimetableSeedData();
  const normalizedQuery = normalizeText(query).toLowerCase();
  const words = normalizedQuery.split(" ").filter(Boolean);
  const [courses, institutions, departments] = await Promise.all([timetableDb.syllabusCourses.toArray(), timetableDb.institutions.toArray(), timetableDb.departments.toArray()]);
  const institutionMap = new Map(institutions.map((institution) => [institution.id, institution]));
  const departmentMap = new Map(departments.map((department) => [department.id, department]));

  return courses
    .filter((course) => !institutionId || course.institutionId === institutionId)
    .filter((course) => !departmentId || course.departmentId === departmentId)
    .filter((course) => words.length === 0 || words.every((word) => getCourseSearchText(course).includes(word)))
    .sort((left, right) => getComparableTimestamp(right.updatedAt).localeCompare(getComparableTimestamp(left.updatedAt)))
    .slice(0, 80)
    .map((course) => {
      const institution = institutionMap.get(course.institutionId);
      const department = departmentMap.get(course.departmentId);
      return { ...course, searchText: getCourseSearchText(course), institutionName: institution?.name ?? "", departmentName: department?.name ?? "", facultyName: department?.facultyName ?? "" };
    });
};
const saveCalendarTimetableCourse = async (draft: CalendarTimetableCourseDraft): Promise<void> => {
  const periods = await listCalendarTimetablePeriods();
  const slots = normalizeSlots(draft.slots, periods);
  const title = normalizeText(draft.title) || DEFAULT_UNTITLED_COURSE_TITLE;
  const now = createTimestamp();

  if (slots.length === 0) return;

  await timetableDb.courses.put({ id: draft.id ?? createCourseId(), semesterId: normalizeSemesterId(draft.semesterId), syllabusCourseId: draft.syllabusCourseId, institutionId: draft.institutionId, departmentId: draft.departmentId, title, room: normalizeText(draft.room), teacher: normalizeText(draft.teacher), memo: normalizeText(draft.memo), colorKey: draft.colorKey, slots, createdAt: draft.createdAt ?? now, updatedAt: now });
};
const addCalendarTimetableCourseFromSyllabus = async (syllabusCourse: CalendarTimetableSyllabusCourse, semesterId: string): Promise<void> => {
  const periods = await listCalendarTimetablePeriods();
  const slots = createCourseSlotsFromSyllabusCourse(syllabusCourse, periods);
  await saveCalendarTimetableCourse({ semesterId, syllabusCourseId: syllabusCourse.id, institutionId: syllabusCourse.institutionId, departmentId: syllabusCourse.departmentId, title: syllabusCourse.title, room: syllabusCourse.room, teacher: syllabusCourse.teacher, memo: syllabusCourse.memo, colorKey: syllabusCourse.colorKey, slots });
};
const saveCalendarTimetableSyllabusCourse = async (draft: CalendarTimetableSyllabusCourseDraft): Promise<void> => {
  const institutionName = normalizeText(draft.institutionName);
  const departmentName = normalizeText(draft.departmentName);
  const facultyName = normalizeText(draft.facultyName);
  const title = normalizeText(draft.title);
  const now = createTimestamp();

  if (!institutionName || !departmentName || !title) return;

  await timetableDb.transaction("rw", timetableDb.institutions, timetableDb.departments, timetableDb.syllabusCourses, async () => {
    const existingInstitution = await findInstitutionByName(institutionName);
    const institution: CalendarTimetableInstitution = existingInstitution ?? { id: createInstitutionId(), name: institutionName, kind: draft.institutionKind, region: "", source: draft.source ?? "manual", createdAt: now, updatedAt: now };
    const nextInstitution = { ...institution, kind: draft.institutionKind, updatedAt: now };
    await timetableDb.institutions.put(nextInstitution);

    const existingDepartment = await findDepartmentByName(nextInstitution.id, facultyName, departmentName);
    const department: CalendarTimetableDepartment = existingDepartment ?? { id: createDepartmentId(), institutionId: nextInstitution.id, facultyName, name: departmentName, source: draft.source ?? "manual", createdAt: now, updatedAt: now };
    const nextDepartment = { ...department, facultyName, name: departmentName, updatedAt: now };
    await timetableDb.departments.put(nextDepartment);

    const searchText = createSearchText([nextInstitution.name, nextDepartment.facultyName, nextDepartment.name, title, draft.teacher, draft.room, draft.semesterLabel, draft.credits, draft.memo]);
    await timetableDb.syllabusCourses.put({ id: createSyllabusCourseId(), institutionId: nextInstitution.id, departmentId: nextDepartment.id, title, room: normalizeText(draft.room), teacher: normalizeText(draft.teacher), semesterLabel: normalizeText(draft.semesterLabel), credits: normalizeText(draft.credits), memo: normalizeText(draft.memo), syllabusUrl: normalizeText(draft.syllabusUrl), colorKey: draft.colorKey, slots: draft.slots, source: draft.source ?? "manual", searchText, createdAt: now, updatedAt: now });
  });
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
  await timetableDb.periods.put({ ...period, label: normalizeText(period.label) || `${period.order + 1}`, startTime: normalizeText(period.startTime), endTime: normalizeText(period.endTime) });
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



export { addCalendarTimetableCourseFromSyllabus, addCalendarTimetablePeriod, deleteCalendarTimetableCourse, deleteCalendarTimetablePeriod, ensureCalendarTimetableSeedData, getCalendarTimetableSettings, listCalendarTimetableCourses, listCalendarTimetableDepartments, listCalendarTimetableInstitutions, listCalendarTimetablePeriods, normalizeVisibleDayCount, saveCalendarTimetableCourse, saveCalendarTimetableSyllabusCourse, searchCalendarTimetableSyllabusCourses, updateCalendarTimetablePeriod, updateCalendarTimetableVisibleDayCount };
