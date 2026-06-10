import { useCallback, useEffect, useState } from "react";
import { liveQuery } from "dexie";
import type { CalendarTimetableCourse, CalendarTimetableCourseDraft, CalendarTimetablePeriod, CalendarTimetableSettings, CalendarTimetableVisibleDayCount } from "./calendarTimetable.types";
import { addCalendarTimetablePeriod, deleteCalendarTimetableCourse, deleteCalendarTimetablePeriod, ensureCalendarTimetableSeedData, getCalendarTimetableSettings, listCalendarTimetableCourses, listCalendarTimetablePeriods, saveCalendarTimetableCourse, updateCalendarTimetablePeriod, updateCalendarTimetableVisibleDayCount } from "./calendarTimetable.storage";

type UseCalendarTimetableState = {
  courses: CalendarTimetableCourse[];
  periods: CalendarTimetablePeriod[];
  settings: CalendarTimetableSettings | null;
  isLoading: boolean;
};

type UseCalendarTimetableReturn = UseCalendarTimetableState & {
  saveCourse: (draft: CalendarTimetableCourseDraft) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;
  updateVisibleDayCount: (visibleDayCount: CalendarTimetableVisibleDayCount) => Promise<void>;
  addPeriod: () => Promise<void>;
  updatePeriod: (period: CalendarTimetablePeriod) => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;
};

const createInitialState = (): UseCalendarTimetableState => ({ courses: [], periods: [], settings: null, isLoading: true });

const loadCalendarTimetableState = async (): Promise<UseCalendarTimetableState> => {
  await ensureCalendarTimetableSeedData();
  const settings = await getCalendarTimetableSettings();
  const [periods, courses] = await Promise.all([listCalendarTimetablePeriods(), listCalendarTimetableCourses(settings.activeSemesterId)]);
  return { courses, periods, settings, isLoading: false };
};

const useCalendarTimetable = (): UseCalendarTimetableReturn => {
  const [state, setState] = useState<UseCalendarTimetableState>(createInitialState);

  useEffect(() => {
    const subscription = liveQuery(loadCalendarTimetableState).subscribe({
      next: setState,
      error: () => setState((currentState) => ({ ...currentState, isLoading: false })),
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

  return { ...state, saveCourse, deleteCourse, updateVisibleDayCount, addPeriod, updatePeriod, deletePeriod };
};

export { useCalendarTimetable };
