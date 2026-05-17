export type CalendarWeekStartDay = "sunday" | "monday";

export type CalendarTimestampLike =
  | Date
  | string
  | number
  | {
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
      _seconds?: number;
      _nanoseconds?: number;
    }
  | null
  | undefined;

export type CalendarFolderLike = {
  id?: string;
  folderId?: string;
  isDeleted?: boolean;
  is_deleted?: boolean;
};

export type CalendarCardLike = {
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

export type CalendarCardSetLike = {
  id: string;
  folderId?: string | null;
  isDeleted?: boolean;
};

export type CalendarDisplayCard = CalendarCardLike & {
  is_overdue?: boolean;
};

export type CalendarStudyLogLike = {
  id?: string;
  studiedAt?: CalendarTimestampLike;
  createdAt?: CalendarTimestampLike;
};

export type CalendarDateKey = string;

export type CalendarCardsByDate = Record<
  CalendarDateKey,
  CalendarDisplayCard[]
>;

export type CalendarResistanceLegendItem = {
  label: string;
  min: number;
  max: number;
  color: string;
};

export type CalendarDayCell = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  cards: CalendarDisplayCard[];
  intensity: number;
};

export type CalendarHeaderViewModel = {
  monthLabel: string;
  streak: number;
};

export type CalendarSummaryViewModel = {
  todayDueCount: number;
  todayDescription: string;
  isTodaySelected: boolean;
};

export type CalendarGridViewModel = {
  weekDays: string[];
  days: CalendarDayCell[];
};

export type CalendarScreenViewModel = {
  header: CalendarHeaderViewModel;
  summary: CalendarSummaryViewModel;
  grid: CalendarGridViewModel;
  selectedDateLabel: string;
};

//CalendarPane.tsx
export type CalendarViewMode = "month" | "week" | "days";

export type CalendarToolbarMode = "calendar" | "timeline";

export type CalendarDemoEvent = {
  id: string;
  title: string;
  startsAt: Date;
  minutes: number;
};

export type TimelineBufferDays = {
  before: number;
  after: number;
};

export type MiniCalendarDay = {
  date: Date;
  dayNumber: string;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
};
