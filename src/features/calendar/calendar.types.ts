type CalendarWeekStartDay = "sunday" | "monday";
type CalendarTimestampLike = | Date | string | number | { toDate?: () => Date;
  seconds?: number;
  nanoseconds?: number;
  _seconds?: number;
  _nanoseconds?: number;
}
  | null
  | undefined;
type CalendarFolderLike = {
  id?: string;
  folderId?: string;
  isDeleted?: boolean;
  is_deleted?: boolean;
};
type CalendarCardLike = {
  id: string;
  cardSetId?: string | null;
  card_set_id?: string | null;
  folderId?: string | null;
  folder_id?: string | null;
  next_review_date?: CalendarTimestampLike;
  nextReviewDate?: CalendarTimestampLike;
  isDeleted?: boolean;
  is_deleted?: boolean;
  deleted?: boolean;
  deletedAt?: unknown;
  deleted_at?: unknown;
  isDraft?: boolean;
  is_draft?: boolean;
  isSilent?: boolean;
  is_silent?: boolean;
  hasUncertainty?: boolean;
  isBookmarked?: boolean;
  isCompleted?: boolean;
  currentLevel?: number | null;
  memoryStability?: number | null;
  title?: string;
};
type CalendarCardSetLike = {
  id: string;
  folderId?: string | null;
  isDeleted?: boolean;
};
type CalendarDisplayCard = CalendarCardLike & { is_overdue?: boolean;
};
type CalendarStudyLogLike = {
  id?: string;
  studiedAt?: CalendarTimestampLike;
  createdAt?: CalendarTimestampLike;
};
type CalendarDateKey = string;
type CalendarCardsByDate = Record<CalendarDateKey, CalendarDisplayCard[]>;
type CalendarResistanceLegendItem = {
  label: string;
  min: number;
  max: number;
  color: string;
};
type CalendarDayCell = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  cards: CalendarDisplayCard[];
  intensity: number;
};
type CalendarHeaderViewModel = {
  monthLabel: string;
  streak: number;
};
type CalendarSummaryViewModel = {
  todayDueCount: number;
  todayDescription: string;
  isTodaySelected: boolean;
};
type CalendarGridViewModel = {
  weekDays: string[];
  days: CalendarDayCell[];
};
type CalendarScreenViewModel = {
  header: CalendarHeaderViewModel;
  summary: CalendarSummaryViewModel;
  grid: CalendarGridViewModel;
  selectedDateLabel: string;
};
type CalendarViewMode = "year" | "month" | "week" | "threeDays" | "days" | "timetable" | "list" | "pieChart";
type CalendarViewModeSelection = CalendarViewMode | readonly CalendarViewMode[];
type CalendarToolbarMode = "calendar" | "task";
type CalendarDemoEvent = {
  id: string;
  title: string;
  startsAt: Date;
  minutes: number;
};

export type { CalendarWeekStartDay, CalendarTimestampLike, CalendarFolderLike, CalendarCardLike, CalendarCardSetLike, CalendarDisplayCard, CalendarStudyLogLike, CalendarDateKey, CalendarCardsByDate, CalendarResistanceLegendItem, CalendarDayCell, CalendarHeaderViewModel, CalendarSummaryViewModel, CalendarGridViewModel, CalendarScreenViewModel, CalendarViewMode, CalendarViewModeSelection, CalendarToolbarMode, CalendarDemoEvent };
