import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { buildCardSetById, resolveCardFolderIdStrict } from "@/domain/card/selectors/cardFolder";
import type { CalendarCardLike, CalendarCardsByDate, CalendarCardSetLike, CalendarDayCell, CalendarDisplayCard, CalendarFolderLike, CalendarGridViewModel, CalendarScreenViewModel, CalendarStudyLogLike, CalendarSummaryViewModel, CalendarWeekStartDay } from "./calendar.types";
import { getCalendarIntensity, getStreakFromLogs, getTodayDescription, getWeekDays, normalizeDateOnly, toDate, toDateKey } from "./calendar.utils";



const isDeletedCard = (card: CalendarCardLike) => {
  return Boolean(
    card.isDeleted ??
    card.is_deleted ??
    card.deleted ??
    card.deletedAt ??
    card.deleted_at,
  );
};
const isDraftCard = (card: CalendarCardLike) => {
  return Boolean(card.isDraft ?? card.is_draft);
};
const isSilentCard = (card: CalendarCardLike) => {
  return Boolean(card.isSilent ?? card.is_silent);
};
const buildFolderMap = (folders: CalendarFolderLike[]) => {
  const folderMap = new Map<string, CalendarFolderLike>();

  folders.forEach((folder) => {
    const id = folder.id ?? folder.folderId;
    if (typeof id === "string" && id.trim() !== "") {
      folderMap.set(id, folder);
    }
  });

  return folderMap;
};
const buildCardsByDate = ({ cards, cardSets, folders, foldersLoading, autoCarryOver }: { cards: CalendarCardLike[];
  cardSets: CalendarCardSetLike[];
  folders: CalendarFolderLike[];
  foldersLoading: boolean;
  autoCarryOver: boolean;
}): CalendarCardsByDate => {
  const grouped: CalendarCardsByDate = {};
  const folderMap = buildFolderMap(folders);
  const cardSetById = buildCardSetById(
    cardSets.filter((cardSet) => !cardSet.isDeleted),
  );
  const today = normalizeDateOnly(new Date());
  const todayKey = toDateKey(today);

  cards
    .filter((card) => {
      if (isDeletedCard(card)) return false;
      if (isDraftCard(card)) return false;
      if (isSilentCard(card)) return false;

      const dateValue = card.next_review_date ?? card.nextReviewDate;
      if (!dateValue) return false;

      const folderId = resolveCardFolderIdStrict(card, cardSetById);

      if (!folderId) return false;
      if (foldersLoading) return true;

      const folder = folderMap.get(folderId);
      if (!folder) return false;

      return !(folder.isDeleted ?? folder.is_deleted);
    })
    .forEach((card) => {
      const dateValue = card.next_review_date ?? card.nextReviewDate;
      const dateObj = toDate(dateValue);
      if (!dateObj) return;

      const reviewDate = normalizeDateOnly(dateObj);
      const isOverdue = autoCarryOver && reviewDate < today;
      const dateKey = isOverdue ? todayKey : toDateKey(reviewDate);

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      const nextCard: CalendarDisplayCard = isOverdue
        ? { ...card, is_overdue: true }
        : card;

      grouped[dateKey].push(nextCard);
    });

  return grouped;
};
const buildTodaySummary = (cardsByDate: CalendarCardsByDate): CalendarSummaryViewModel => {
  const todayKey = toDateKey(new Date());
  const todayDueCount = (cardsByDate[todayKey] ?? []).length;

  return {
    todayDueCount,
    todayDescription: getTodayDescription(todayDueCount),
    isTodaySelected: false,
  };
};
const buildStreak = (remoteLogs: CalendarStudyLogLike[], localLogs: CalendarStudyLogLike[]) => {
  return getStreakFromLogs([...remoteLogs, ...localLogs]);
};
const buildCalendarGridViewModel = ({ currentDate, selectedDate, cardsByDate, weekStartDay }: { currentDate: Date;
  selectedDate: Date;
  cardsByDate: CalendarCardsByDate;
  weekStartDay: CalendarWeekStartDay;
}): CalendarGridViewModel => {
  const weekStartsOn = weekStartDay === "sunday" ? 0 : 1;
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn });
  const endDate = endOfWeek(monthEnd, { weekStartsOn });

  const weekDays = getWeekDays(weekStartDay);
  const days: CalendarDayCell[] = [];

  let cursor = startDate;
  while (cursor <= endDate) {
    const dateKey = format(cursor, "yyyy-MM-dd");
    const cards = cardsByDate[dateKey] ?? [];

    days.push({
      date: cursor,
      dateKey,
      isCurrentMonth: isSameMonth(cursor, currentDate),
      isSelected: isSameDay(cursor, selectedDate),
      isToday: isToday(cursor),
      cards,
      intensity: getCalendarIntensity(cards.length),
    });

    cursor = addDays(cursor, 1);
  }

  return {
    weekDays,
    days,
  };
};
const buildCalendarScreenViewModel = ({ currentDate, selectedDate, cardsByDate, weekStartDay, remoteLogs, localLogs }: { currentDate: Date;
  selectedDate: Date;
  cardsByDate: CalendarCardsByDate;
  weekStartDay: CalendarWeekStartDay;
  remoteLogs: CalendarStudyLogLike[];
  localLogs: CalendarStudyLogLike[];
}): CalendarScreenViewModel => {
  const summaryBase = buildTodaySummary(cardsByDate);

  return {
    header: {
      monthLabel: format(currentDate, "MMMM yyyy"),
      streak: buildStreak(remoteLogs, localLogs),
    },
    summary: {
      ...summaryBase,
      isTodaySelected: isSameDay(selectedDate, new Date()),
    },
    grid: buildCalendarGridViewModel({
      currentDate,
      selectedDate,
      cardsByDate,
      weekStartDay,
    }),
    selectedDateLabel: format(selectedDate, "yyyy/MM/dd"),
  };
};



export { buildCardsByDate, buildTodaySummary, buildStreak, buildCalendarGridViewModel, buildCalendarScreenViewModel };
