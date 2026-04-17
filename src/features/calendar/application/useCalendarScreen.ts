import { useQuery } from "@tanstack/react-query";
import { addDays, addMonths, startOfMonth } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/contexts/AuthContext";
import { useCards } from "@/hooks/card/useCards";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useFolders } from "@/hooks/folder/useFolders";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { firestoreDb } from "@/infrastructure/firebase/client";
import { getLocalDb } from "@/services/localDB";
import { useTodayStudyStore } from "@/stores/useTodayStudyStore";

import type {
  CalendarDisplayCard,
  CalendarStudyLogLike,
  CalendarWeekStartDay,
} from "@/features/calendar/domain/calendarTypes";
import {
  getArrowDayDiff,
  isFocusableInputTarget,
} from "@/features/calendar/domain/calendarUtils";
import {
  buildCalendarScreenViewModel,
  buildCardsByDate,
} from "./calendarSelectors";

export const useCalendarScreen = () => {
  const { currentUser } = useAuthSession();
  const navigateState = useState(new Date());
  const [currentDate, setCurrentDate] = navigateState;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMetaOpen, setIsMetaOpen] = useState(true);

  const { cards = [] } = useCards();
  const { cardSets = [] } = useCardSets();
  const { folders = [], loading: foldersLoading } = useFolders();
  const { settings } = useUserSettings();
  const { ratings } = useTodayStudyStore();

  const { data: remoteStudyLogs = [] } = useQuery<CalendarStudyLogLike[]>({
    queryKey: ["studyLogs", currentUser?.uid],
    queryFn: async () => {
      if (!currentUser || !firestoreDb) return [];

      const q = query(
        collection(firestoreDb, "studyLogs"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(q);

      return snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .slice(0, 100) as CalendarStudyLogLike[];
    },
    enabled: Boolean(currentUser),
  });

  const localStudyLogs = useLiveQuery<CalendarStudyLogLike[]>(async () => {
    if (!currentUser) return [];
    const db = await getLocalDb(currentUser.uid);
    return (await db.table("studyLogs").toArray()) as CalendarStudyLogLike[];
  }, [currentUser]);

  const weekStartDay: CalendarWeekStartDay =
    settings?.weekStartDay === "sunday" ? "sunday" : "monday";

  const cardsByDate = useMemo(() => {
    return buildCardsByDate({
      cards,
      cardSets,
      folders,
      foldersLoading,
      autoCarryOver: settings?.autoCarryOver ?? true,
    });
  }, [cards, cardSets, folders, foldersLoading, settings?.autoCarryOver]);

  const viewModel = useMemo(() => {
    return buildCalendarScreenViewModel({
      currentDate,
      selectedDate,
      cardsByDate,
      weekStartDay,
      remoteLogs: remoteStudyLogs,
      localLogs: localStudyLogs ?? [],
    });
  }, [
    currentDate,
    selectedDate,
    cardsByDate,
    weekStartDay,
    remoteStudyLogs,
    localStudyLogs,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFocusableInputTarget(event.target)) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const diff = getArrowDayDiff(event.key);
      if (diff === null) {
        return;
      }

      event.preventDefault();

      const nextDate = addDays(selectedDate, diff);
      setSelectedDate(nextDate);

      if (
        nextDate.getMonth() !== currentDate.getMonth() ||
        nextDate.getFullYear() !== currentDate.getFullYear()
      ) {
        setCurrentDate(startOfMonth(nextDate));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentDate, selectedDate, setCurrentDate]);

  const selectedDateKey = viewModel.grid.days.find(
    (day) => day.isSelected,
  )?.dateKey;
  const selectedDateCards: CalendarDisplayCard[] =
    (selectedDateKey ? cardsByDate[selectedDateKey] : []) ?? [];

  const openToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => addMonths(prev, -1));
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => addMonths(prev, 1));
  };

  const selectDate = (date: Date) => {
    setSelectedDate(date);
  };

  return {
    isMetaOpen,
    setIsMetaOpen,
    currentDate,
    selectedDate,
    selectedDateCards,
    viewModel,
    ratings,
    openToday,
    goToPreviousMonth,
    goToNextMonth,
    selectDate,
  };
};
