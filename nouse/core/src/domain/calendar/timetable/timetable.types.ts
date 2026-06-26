type CalendarTimetableWeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type CalendarTimetableVisibleDayCount = 5 | 6 | 7;
type CalendarTimetableColorKey = "gray" | "purple" | "teal" | "pink" | "amber" | "blue" | "green" | "red" | "coral" | "sky";
type CalendarTimetableInstitutionKind = "university" | "vocational" | "college" | "other";
type CalendarTimetableCatalogSource = "manual" | "userSubmitted" | "syllabus" | "cloud";
type CalendarTimetablePeriod = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  order: number;
};
type CalendarTimetableSlot = {
  dayIndex: CalendarTimetableWeekdayIndex;
  periodId: string;
};
type CalendarTimetableSyllabusSlot = {
  dayIndex: CalendarTimetableWeekdayIndex;
  periodLabel: string;
};
type CalendarTimetableInstitution = {
  id: string;
  name: string;
  kind: CalendarTimetableInstitutionKind;
  region: string;
  source: CalendarTimetableCatalogSource;
  createdAt: string;
  updatedAt: string;
};
type CalendarTimetableDepartment = {
  id: string;
  institutionId: string;
  facultyName: string;
  name: string;
  source: CalendarTimetableCatalogSource;
  createdAt: string;
  updatedAt: string;
};
type CalendarTimetableSyllabusCourse = {
  id: string;
  institutionId: string;
  departmentId: string;
  title: string;
  room: string;
  teacher: string;
  semesterLabel: string;
  credits: string;
  memo: string;
  syllabusUrl: string;
  colorKey: CalendarTimetableColorKey;
  slots: CalendarTimetableSyllabusSlot[];
  source: CalendarTimetableCatalogSource;
  searchText: string;
  createdAt: string;
  updatedAt: string;
};
type CalendarTimetableSyllabusCourseDraft = {
  institutionName: string;
  institutionKind: CalendarTimetableInstitutionKind;
  departmentName: string;
  facultyName: string;
  title: string;
  room: string;
  teacher: string;
  semesterLabel: string;
  credits: string;
  memo: string;
  syllabusUrl: string;
  colorKey: CalendarTimetableColorKey;
  slots: CalendarTimetableSyllabusSlot[];
  source?: CalendarTimetableCatalogSource;
};
type CalendarTimetableCourse = {
  id: string;
  semesterId: string;
  syllabusCourseId?: string;
  institutionId?: string;
  departmentId?: string;
  title: string;
  room: string;
  teacher: string;
  memo: string;
  colorKey: CalendarTimetableColorKey;
  slots: CalendarTimetableSlot[];
  createdAt: string;
  updatedAt: string;
};
type CalendarTimetableCourseDraft = {
  id?: string;
  semesterId: string;
  syllabusCourseId?: string;
  institutionId?: string;
  departmentId?: string;
  title: string;
  room: string;
  teacher: string;
  memo: string;
  colorKey: CalendarTimetableColorKey;
  slots: CalendarTimetableSlot[];
  createdAt?: string;
};
type CalendarTimetableSettings = {
  id: string;
  activeSemesterId: string;
  visibleDayCount: CalendarTimetableVisibleDayCount;
  updatedAt: string;
};
type CalendarTimetableSyllabusCourseDisplay = CalendarTimetableSyllabusCourse & { institutionName: string;
  departmentName: string;
  facultyName: string;
};

export type { CalendarTimetableWeekdayIndex, CalendarTimetableVisibleDayCount, CalendarTimetableColorKey, CalendarTimetableInstitutionKind, CalendarTimetableCatalogSource, CalendarTimetablePeriod, CalendarTimetableSlot, CalendarTimetableSyllabusSlot, CalendarTimetableInstitution, CalendarTimetableDepartment, CalendarTimetableSyllabusCourse, CalendarTimetableSyllabusCourseDraft, CalendarTimetableCourse, CalendarTimetableCourseDraft, CalendarTimetableSettings, CalendarTimetableSyllabusCourseDisplay };
