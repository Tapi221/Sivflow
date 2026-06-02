import rawTranslations from "./translations.json";
import type { Locale } from "./locale.store";

export type RawTranslations = {
  weekdayLabels: string[];
  calendarMonthWeekdays: string[];
  monthRowResizeTitle: string;
  monthRowResizeAriaLabel: string;
  todayDescriptionEmpty: string;
  todayDescriptionDue: string;
  myProjects: string;
  google: string;
  addGoogleCalendar: string;
  addAnotherGoogleAccount: string;
  reconnectGoogleCalendar: string;
  connecting: string;
  taskViewComingSoon: string;
  addTask: string;
  taskStatusNotStarted: string;
  taskStatusInProgress: string;
  taskStatusReview: string;
  taskStatusDone: string;
  overflowEvents: string;
  allDay: string;
  calendarTab: string;
  timelineTab: string;
  taskTab: string;
  searchAction: string;
  filterAction: string;
  sortAction: string;
  fieldsAction: string;
  viewYear: string;
  viewMonth: string;
  viewWeek: string;
  viewThreeDays: string;
  viewDay: string;
  viewTimetable: string;
  viewList: string;
  viewPieChart: string;
  viewsLabel: string;
  todayButton: string;
  exportCalendarPdf: string;
  printRangeLabel: string;
  printRangeCurrent: string;
  printRangeDay: string;
  printRangeWeek: string;
  printRangeMonth: string;
  printRangeCustom: string;
  printRangeStartDate: string;
  printRangeEndDate: string;
  todayTooltipDateFormat: string;
  previousLabel: string;
  nextLabel: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
  sidebarAriaLabel: string;
  sidebarMainNavAriaLabel: string;
  sidebarFooterNavAriaLabel: string;
  sidebarHome: string;
  sidebarLibrary: string;
  sidebarTags: string;
  sidebarSchedule: string;
  sidebarExplore: string;
  sidebarSettings: string;
  sidebarLogout: string;
  sidebarToggleOpen: string;
  sidebarToggleClose: string;
  settingLanguageLabel: string;
  settingLanguageTitle: string;
  langJapanese: string;
  langEnglish: string;
  dateFnsLocaleKey: "ja" | "en-US";
};

export type Translations = Omit<RawTranslations, "overflowEvents"> & {
  overflowEvents: (count: number) => string;
};

const formatCountTemplate = (template: string, count: number): string =>
  template.replace("{{count}}", String(count));

const toTranslations = (translations: RawTranslations): Translations => ({
  ...translations,
  overflowEvents: (count: number) => formatCountTemplate(translations.overflowEvents, count),
});

export const RAW_TRANSLATIONS = rawTranslations as Record<Locale, RawTranslations>;

export const TRANSLATIONS: Record<Locale, Translations> = {
  ja: toTranslations(RAW_TRANSLATIONS.ja),
  en: toTranslations(RAW_TRANSLATIONS.en),
};
