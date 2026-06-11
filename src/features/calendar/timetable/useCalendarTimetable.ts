import { useCallback, useEffect, useState } from "react";
import { createDefaultCalendarTimetablePeriods } from "@core/domain/calendar/timetable/timetable.model";
import type { CalendarTimetableCourse, CalendarTimetableCourseDraft, CalendarTimetableDepartment, CalendarTimetableInstitution, CalendarTimetablePeriod, CalendarTimetableSettings, CalendarTimetableSyllabusCourse, CalendarTimetableSyllabusCourseDisplay, CalendarTimetableSyllabusCourseDraft, CalendarTimetableVisibleDayCount } from "@core/domain/calendar/timetable/timetable.types";
import { liveQuery } from "dexie";
import { addCalendarTimetableCourseFromSyllabus, addCalendarTimetablePeriod, deleteCalendarTimetableCourse, deleteCalendarTimetablePeriod, ensureCalendarTimetableSeedData, getCalendarTimetableSettings, listCalendarTimetableCourses, listCalendarTimetableDepartments, listCalendarTimetableInstitutions, listCalendarTimetablePeriods, saveCalendarTimetableCourse, saveCalendarTimetableSyllabusCourse, searchCalendarTimetableSyllabusCourses, updateCalendarTimetablePeriod, updateCalendarTimetableVisibleDayCount } from "./calendarTimetable.storage";

type UseCalendarTimetableState = {
  courses: CalendarTimetableCourse[];
  departments: CalendarTimetableDepartment[];
  institutions: CalendarTimetableInstitution[];
  periods: CalendarTimetablePeriod[];
  settings: CalendarTimetableSettings | null;
  syllabusCourses: CalendarTimetableSyllabusCourseDisplay[];
  isLoading: boolean;
};
type UseCalendarTimetableReturn = UseCalendarTimetableState & {
  saveCourse: (draft: CalendarTimetableCourseDraft) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;
  updateVisibleDayCount: (visibleDayCount: CalendarTimetableVisibleDayCount) => Promise<void>;
  addPeriod: () => Promise<void>;
  updatePeriod: (period: CalendarTimetablePeriod) => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;
  saveSyllabusCourse: (draft: CalendarTimetableSyllabusCourseDraft) => Promise<void>;
  addCourseFromSyllabus: (syllabusCourse: CalendarTimetableSyllabusCourse, semesterId: string) => Promise<void>;
  searchSyllabusCourses: (query: string, institutionId?: string | null, departmentId?: string | null) => Promise<CalendarTimetableSyllabusCourseDisplay[]>;
};

const DEFAULT_SETTINGS: CalendarTimetableSettings = { id: "default", activeSemesterId: "default-semester", visibleDayCount: 5, updatedAt: "" };
const DEFAULT_PERIODS = createDefaultCalendarTimetablePeriods();

const createInitialState = (): UseCalendarTimetableState => ({ courses: [], departments: [], institutions: [], periods: DEFAULT_PERIODS, settings: DEFAULT_SETTINGS, syllabusCourses: [], isLoading: true });
const loadCalendarTimetableState = async (): Promise<UseCalendarTimetableState> => {
  await ensureCalendarTimetableSeedData();
  const settings = await getCalendarTimetableSettings();
  const [periods, courses, institutions, departments, syllabusCourses] = await Promise.all([listCalendarTimetablePeriods(), listCalendarTimetableCourses(settings.activeSemesterId), listCalendarTimetableInstitutions(), listCalendarTimetableDepartments(""), searchCalendarTimetableSyllabusCourses("")]);
  return { courses, departments, institutions, periods: periods.length > 0 ? periods : DEFAULT_PERIODS, settings, syllabusCourses, isLoading: false };
};
const useCalendarTimetable = (): UseCalendarTimetableReturn => {
  const [state, setState] = useState<UseCalendarTimetableState>(createInitialState);

  useEffect(() => {
    const subscription = liveQuery(loadCalendarTimetableState).subscribe({
      next: setState,
      error: () => setState((currentState) => ({ ...currentState, periods: currentState.periods.length > 0 ? currentState.periods : DEFAULT_PERIODS, settings: currentState.settings ?? DEFAULT_SETTINGS, isLoading: false })),
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const saveCourse = useCallback((draft: CalendarTimetableCourseDraft) => saveCalendarTimetableCourse(draft), []);
  const deleteCourse = useCallback((courseId: string) => deleteCalendarTimetableCourse(courseId), []);
  const updateVisibleDayCount = useCallback((visibleDayCount: CalendarTimetableVisibleDayCount) => updateCalendarTimetableVisibleDayCount(visibleDayCount), []);
  const addPeriod = useCallback(() => addCalendarTimetablePeriod(), []);
  const updatePeriod = useCallback((period: CalendarTimetablePeriod) => updateCalendarTimetablePeriod(period), []);
  const deletePeriod = useCallback((periodId: string) => deleteCalendarTimetablePeriod(periodId), []);
  const saveSyllabusCourse = useCallback((draft: CalendarTimetableSyllabusCourseDraft) => saveCalendarTimetableSyllabusCourse(draft), []);
  const addCourseFromSyllabus = useCallback((syllabusCourse: CalendarTimetableSyllabusCourse, semesterId: string) => addCalendarTimetableCourseFromSyllabus(syllabusCourse, semesterId), []);
  const searchSyllabusCourses = useCallback((query: string, institutionId?: string | null, departmentId?: string | null) => searchCalendarTimetableSyllabusCourses(query, institutionId, departmentId), []);

  return { ...state, saveCourse, deleteCourse, updateVisibleDayCount, addPeriod, updatePeriod, deletePeriod, saveSyllabusCourse, addCourseFromSyllabus, searchSyllabusCourses };
};

export { useCalendarTimetable };
