import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { useCards } from "@/hooks/card/useCards";
import { useFolders } from "@/hooks/folder/useFolders";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { useAuthSession } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyMetaPanel } from "@/components/card/panels/EmptyMetaPanel";
import { RatingCountTiles } from "@/features/study/RatingCountTiles";
import { ChevronLeft, ChevronRight } from "@/ui/icons";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";
import { useTodayStudyStore } from "@/stores/useTodayStudyStore";
import { getLocalDb } from "@/services/localDB";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { firestoreDb } from "@/services/firebase";

// ---------------------------------------------------------------------------
// RESISTANCE LEGEND (Static Definition for Maturity/Resistance)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// RESISTANCE LEGEND (Matched to Statistics/ReviewUtils Phases)
// ---------------------------------------------------------------------------
const RESISTANCE_LEGEND = [
  { label: "要復習 (Unstable)", min: 0, max: 20, color: "bg-red-400" },
  { label: "覚えかけ (Fragile)", min: 20, max: 40, color: "bg-orange-400" },
  { label: "定着途上 (Growing)", min: 40, max: 65, color: "bg-yellow-400" },
  { label: "安定 (Stable)", min: 65, max: 85, color: "bg-green-400" },
  { label: "長期保持 (Solid)", min: 85, max: 100, color: "bg-emerald-400" },
];

const toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "object") {
    const seconds =
      typeof value.seconds === "number"
        ? value.seconds
        : typeof value._seconds === "number"
          ? value._seconds
          : null;
    const nanoseconds =
      typeof value.nanoseconds === "number"
        ? value.nanoseconds
        : typeof value._nanoseconds === "number"
          ? value._nanoseconds
          : 0;
    if (seconds !== null) {
      const d = new Date(seconds * 1000 + Math.floor(nanoseconds / 1e6));
      return isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

export default function Calendar() {
  const navigate = useNavigate();
  const { currentUser } = useAuthSession();
  const [isMetaOpen, setIsMetaOpen] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());

  // Selection state
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }

      const map = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
      };

      if (map[e.key]) {
        e.preventDefault();
        const diff = map[e.key];
        const newDate = addDays(selectedDate, diff);
        setSelectedDate(newDate);

        // Auto-switch month if needed
        if (!isSameMonth(newDate, currentDate)) {
          setCurrentDate(startOfMonth(newDate));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDate, currentDate]);

  const { cards = [] } = useCards();
  const { folders = [], loading: foldersLoading } = useFolders();
  const { settings } = useUserSettings();
  const { ratings } = useTodayStudyStore();
  const { data: studyLogs = [] } = useQuery({
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
        .slice(0, 100);
    },
    enabled: !!currentUser,
  });
  const localStudyLogs = useLiveQuery(async () => {
    if (!currentUser) return [];
    const db = await getLocalDb(currentUser.uid);
    return await db.table("studyLogs").toArray();
  }, [currentUser]);

  const folderMap = useMemo(() => {
    const map = new Map();
    folders.forEach((folder) => {
      const id = folder?.id ?? folder?.folderId;
      if (id) map.set(String(id), folder);
    });
    return map;
  }, [folders]);

  // Get cards grouped by date
  const cardsByDate = useMemo(() => {
    const grouped = {};
    cards
      .filter((c) => {
        const isDeleted = Boolean(
          c.isDeleted ??
          c.is_deleted ??
          c.deleted ??
          c.deletedAt ??
          c.deleted_at,
        );
        const isDraft = Boolean(c.isDraft ?? c.is_draft);
        const dateVal = c.next_review_date || c.nextReviewDate;
        const isSilent = Boolean(c.is_silent ?? c.isSilent);
        const rawFolderId = c.folderId || c.folder_id;
        const folderId = rawFolderId ? String(rawFolderId) : null;

        // 学習バッジと一致させるため、下書き/サイレント/削除済みは除外する。
        if (isDeleted || isDraft || isSilent || !dateVal) return false;

        // フォルダ一覧のロード完了後は、存在しない folderId を除外する。
        // これにより「不明なフォルダ」グループが予定表に出ないようにする。
        if (!folderId) return true;
        if (foldersLoading) return true;
        const folder = folderMap.get(folderId);
        if (!folder) return false;
        return !(folder.isDeleted ?? folder.is_deleted);
      })
      .forEach((card) => {
        const dateValue = card.next_review_date || card.nextReviewDate;
        const dateObj = toDate(dateValue);

        if (!dateObj || isNaN(dateObj.getTime())) return;

        // Auto Carry Over Logic for Calendar Display
        const autoCarryOver = settings?.autoCarryOver ?? true;
        const today = new Date();
        const todayStr = format(today, "yyyy-MM-dd");

        // Reset time for comparison
        const checkDate = new Date(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          dateObj.getDate(),
        );
        const todayDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        );

        let dateKey = format(dateObj, "yyyy-MM-dd");

        // If overdue and autoCarryOver is used, treat as Today
        if (autoCarryOver && checkDate < todayDate) {
          dateKey = todayStr;
        }

        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(
          autoCarryOver && checkDate < todayDate
            ? { ...card, is_overdue: true }
            : card,
        );
      });
    return grouped;
  }, [cards, folderMap, foldersLoading, settings?.autoCarryOver]);

  const todayDateKey = format(new Date(), "yyyy-MM-dd");
  const todayDueCount = (cardsByDate[todayDateKey] || []).length;
  const todayDescription =
    todayDueCount === 0
      ? "今日の復習はありません。"
      : "忘れる前に復習しましょう。";
  const isTodaySelected = isSameDay(selectedDate, new Date());
  const mergedStudyLogs = useMemo(() => {
    const combined = [...studyLogs];
    if (localStudyLogs) combined.push(...localStudyLogs);
    return combined;
  }, [studyLogs, localStudyLogs]);
  const getLogDate = (log) => {
    const raw = log?.studiedAt ?? log?.createdAt;
    const date = raw?.toDate?.() || new Date(raw);
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  };
  const streak = useMemo(() => {
    if (mergedStudyLogs.length === 0) return 0;
    const dates = new Set(
      mergedStudyLogs
        .map(getLogDate)
        .filter(Boolean)
        .map((d) => d.toDateString()),
    );
    const today = new Date();
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      if (dates.has(d.toDateString())) count++;
      else if (i !== 0) break;
    }
    return count;
  }, [mergedStudyLogs]);

  const renderCalendarGrid = () => {
    const weekStartDay = settings?.weekStartDay === "sunday" ? 0 : 1; // 0=Sun, 1=Mon
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: weekStartDay });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: weekStartDay });

    const calendarDays = [];
    let day = startDate;
    while (day <= endDate) {
      calendarDays.push(day);
      day = addDays(day, 1);
    }

    const weekDays =
      weekStartDay === 0
        ? ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
        : ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    return (
      <div className="w-full">
        {/* Days Header */}
        <div className="grid grid-cols-7 mb-4">
          {weekDays.map((d) => (
            <div
              key={d}
              className={cn(
                "text-center text-[10px] font-bold tracking-[0.2em] text-slate-500",
                d === "SUN" && "text-[#FF5A65]", // Sun
                d === "SAT" && "text-[#00A3FF]", // Sat
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-y-2 md:gap-y-4 gap-x-0">
          {calendarDays.map((dayItem) => {
            const dateStr = format(dayItem, "yyyy-MM-dd");
            const isCurrentMonth = isSameMonth(dayItem, currentDate);
            const isSelected = isSameDay(dayItem, selectedDate);
            const isTodayDate = isToday(dayItem);
            const dayCards = cardsByDate[dateStr] || [];
            const hasCards = dayCards.length > 0;

            // Intensity dots
            const intensity = Math.min(5, Math.ceil(dayCards.length / 5)); // 1-5 dots

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDate(dayItem)}
                className={cn(
                  "calendar-day-base cursor-pointer group min-h-[56px] md:min-h-[88px]", // Height increased for 3D bottom border
                  !isCurrentMonth && "opacity-30 grayscale",
                  isSelected ? "calendar-day-selected" : "calendar-day-flat",
                  isTodayDate && !isSelected && "calendar-day-today",
                )}
              >
                {/* Date Number */}
                <span
                  className={cn(
                    "text-sm font-bold mb-1 md:mb-1 transition-colors calendar-date-text",
                    isSelected
                      ? "text-primary-700"
                      : "text-slate-400 group-hover:text-slate-600",
                    isTodayDate && !isSelected && "text-primary-700",
                  )}
                >
                  {format(dayItem, "d")}
                </span>

                {/* Intensity Visual (Dots or Bar) */}
                {hasCards ? (
                  <div className="flex flex-col items-center mt-0 gap-1 w-full">
                    <span
                      className={cn(
                        "text-convex text-lg md:text-xl font-black leading-none tracking-tight",
                        dayCards.some((c) => c.is_overdue)
                          ? "text-[#FF5A65]"
                          : "text-primary-600",
                      )}
                    >
                      {dayCards.length}
                    </span>
                    <div className="hidden md:flex gap-1 justify-center w-full px-2">
                      {Array.from({ length: intensity }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full calendar-dot-3d face-badge-convex",
                            dayCards.some((c) => c.is_overdue)
                              ? "bg-[#FF5A65]"
                              : "bg-primary-400",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Empty State Check (Today) */
                  isTodayDate && (
                    <div className="mt-2 text-[9px] font-bold text-primary-300">
                      TODAY
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-[#F5F7F8] text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 flex">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-3 z-20 h-8 w-8 rounded-full bg-[var(--sidebar-bg)] text-[#334155] surface-control-convex hover:bg-[var(--sidebar-active-bg)]"
        style={{
          right: isMetaOpen
            ? "calc(var(--ui-panel-width) - var(--ui-space-3))"
            : "var(--ui-space-1)",
          transform: "none",
        }}
        onClick={() => setIsMetaOpen((prev) => !prev)}
        aria-label={isMetaOpen ? "close meta panel" : "open meta panel"}
      >
        {isMetaOpen ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      <div className="min-w-0 flex-1 flex flex-col pl-4 pr-4 pt-4 pb-0 md:p-8">
        {/* Main Content Split View */}
        <div className="flex-1 w-full grid grid-cols-1 gap-6 md:gap-8 items-start mb-20 md:mb-0">
          {/* Left: Calendar Grid */}
          <Card className="relative rounded-[32px] md:rounded-[40px] border border-[var(--surface-border)] surface-panel-convex bg-[var(--sidebar-bg)] p-4 md:p-10 h-fit md:min-h-[600px]">
            <div className="absolute top-4 left-4 md:top-8 md:left-8 h-10 rounded-full border border-[var(--surface-border)] bg-white px-3 face-badge-convex z-10 min-w-[112px] text-slate-500 flex items-center">
              <div className="leading-none">
                <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  STREAK
                </div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-[#FB923C]" />
                  <span className="text-lg font-bold leading-none text-slate-500">
                    {streak}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">days</span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                setCurrentDate(now);
                setSelectedDate(now);
              }}
              className="absolute top-4 right-4 md:top-8 md:right-8 h-10 rounded-full border border-[var(--surface-border)] text-slate-500 font-bold px-4 hover:border-primary-600 hover:text-primary-600 bg-white face-badge-convex z-10"
            >
              Today
            </Button>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 md:top-8 z-10">
              <div className="flex items-center bg-white rounded-full p-1 border border-[var(--surface-border)] face-badge-convex h-10 min-w-[280px] md:min-w-[320px] justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentDate(addMonths(currentDate, -1))}
                  className="h-8 w-8 rounded-full text-[#334155] hover:text-primary-600 bg-white surface-control-convex hover:bg-white shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="flex-1 text-center text-[11px] sm:text-xs font-extrabold text-[#334155] tracking-wider uppercase">
                  {format(currentDate, "MMMM yyyy")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="h-8 w-8 rounded-full text-[#334155] hover:text-primary-600 bg-white surface-control-convex hover:bg-white shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="pt-12 md:pt-14">{renderCalendarGrid()}</div>
          </Card>
        </div>

        {/* Footer Legend (Static Resistance Legend) */}
        <div className="w-full mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 md:pl-10 pb-4">
          {/* Standard Calendar Indicators */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#FF5A65]" />
            OVERDUE
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-600" />
            INTENSITY
          </div>

          {/* Separator */}
          <div className="w-px h-3 bg-slate-300 mx-2"></div>

          {/* Resistance Legend */}
          {RESISTANCE_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", item.color)} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {isMetaOpen && (
        <EmptyMetaPanel contentClassName="space-y-3">
          {isTodaySelected && (
            <>
              <button
                type="button"
                onClick={() => navigate(createPageUrl("study"))}
                className="w-full text-left rounded-2xl border border-[var(--surface-border)] bg-white p-3 surface-panel-convex transition-colors hover:bg-[var(--sidebar-active-bg)]"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-primary-600 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                    優先タスク
                  </span>
                  {todayDueCount > 0 && (
                    <span className="h-2 w-2 rounded-full bg-[#FF5A65]" />
                  )}
                </div>

                <h3 className="text-2xl font-bold leading-tight text-slate-800">
                  今日の復習
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {todayDescription}
                </p>

                <div className="mt-3 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                  <div className="text-convex text-4xl font-bold italic leading-none tracking-tight text-primary-600">
                    {todayDueCount}
                  </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Cards Due
                    </div>
                  </div>
                  <div className="face-badge-convex flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              </button>

              <section>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  TODAY'S RATINGS
                </h3>
                <RatingCountTiles
                  counts={{
                    forgot: ratings.forgot,
                    vague: ratings.vague,
                    remembered: ratings.remembered,
                    easy: ratings.easy,
                  }}
                  compact
                  disableHover
                  singleRow
                  surface="concave"
                />
              </section>
            </>
          )}
        </EmptyMetaPanel>
      )}
    </div>
  );
}







