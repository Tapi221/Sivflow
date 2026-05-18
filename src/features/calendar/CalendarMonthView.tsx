import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import * as C from "@/features/calendar/calendar.constants.desktop";
import * as T from "@/features/calendar/calendar.text";
import { generateColorTokens } from "@/features/calendar/calendar.color-tokens";
import type { GoogleCalendarEvent } from "@/features/calendar/hooks/useGoogleCalendarIntegration";

import { useMonthInfiniteScroll } from "./hooks/useMonthInfiniteScroll";
import { useMonthRowResize } from "./hooks/useMonthRowResize";

// ── 月初ラベル（例: "8月"）を返す純粋関数
const getMonthAnnotation = (date: Date): string | null => {
  if (date.getDate() !== 1) return null;
  return format(date, "M月", { locale: ja });
};

// チップ1件の高さ（py-[2px] × 2 + leading-[1.3] × 11px ≈ 18px）+ gap 3px
const CHIP_HEIGHT_PX = 21;
// 日付バッジ top-4(16px) + h-8(32px) + 余白 12px
const CHIPS_TOP_OFFSET_PX = 60;
// 下端の余白
const CHIPS_BOTTOM_MARGIN_PX = 4;

type MonthEventChipProps = {
  event: GoogleCalendarEvent;
};

const MonthEventChip = ({ event }: MonthEventChipProps) => {
  const tokens = generateColorTokens(event.accentColor);
  const timeLabel = format(event.startsAt, "H:mm");

  return (
    <div
      className="flex items-center gap-1 truncate rounded px-1 py-[2px] text-[11px] font-medium leading-[1.3]"
      style={{
        background: tokens.bg,
        borderLeft: `3px solid ${tokens.border}`,
        color: tokens.text,
      }}
      title={`${timeLabel} ${event.title}`}
    >
      <span className="shrink-0 tabular-nums opacity-80">{timeLabel}</span>
      <span className="truncate">{event.title}</span>
    </div>
  );
};

// ── Props 型定義

type CalendarMonthViewProps = {
  currentDate: Date;
  selectedDate: Date;
  scrollTargetToken?: number;
  /** Google Calendar などの外部イベント一覧 */
  visibleEvents?: GoogleCalendarEvent[];
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
};

export const CalendarMonthView = ({
  currentDate,
  selectedDate,
  scrollTargetToken = 0,
  visibleEvents = [],
  onSelectDate,
  onVisibleMonthChange,
}: CalendarMonthViewProps) => {
  const today = useMemo(() => new Date(), []);

  // リサイズ中フラグを両フック間で共有
  const isResizingRef = useRef(false);

  // ドラッグ中のリアルタイム高さ（RAF ごとに更新）
  const [liveRowHeight, setLiveRowHeight] = useState(
    C.readStoredMonthRowHeight,
  );

  const scroll = useMonthInfiniteScroll({
    currentDate,
    scrollTargetToken,
    isResizingRef,
    onVisibleMonthChange,
  });

  const resize = useMonthRowResize({
    scrollContainerRef: scroll.scrollContainerRef,
    weekRowRefsMap: scroll.weekRowRefsMap,
    monthWeeks: scroll.monthWeeks,
    isResizingRef,
    onAfterCommit: scroll.syncVisibleMonth,
    onLiveResize: setLiveRowHeight,
  });

  // 現在の行高から表示できるチップ数を計算
  const maxVisibleChips = Math.max(
    0,
    Math.floor(
      (liveRowHeight - CHIPS_TOP_OFFSET_PX - CHIPS_BOTTOM_MARGIN_PX) /
        CHIP_HEIGHT_PX,
    ),
  );

  return (
    <div
      ref={resize.rootRef}
      className="calendar-month-view flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
      style={resize.monthViewStyle}
    >
      <div
        ref={scroll.scrollContainerRef}
        className="calendar-month-scroll min-h-0 flex-1 overflow-y-auto bg-white"
        onScroll={scroll.handleScroll}
      >
        {/* 曜日ヘッダー */}
        <div className="sticky top-0 z-20 grid h-8 grid-cols-7 border-b border-[#e5e7eb] bg-white">
          {T.WEEKDAY_LABELS.map((label: string) => (
            <div
              key={label}
              className="flex items-center justify-center border-r border-[#eef0f3] text-[12px] font-medium leading-normal text-[#8f929c] last:border-r-0"
            >
              {label}
            </div>
          ))}
        </div>

        {/* 月グリッド */}
        <div className="bg-white">
          {scroll.monthWeeks.map((week) => (
            <div
              key={week.key}
              ref={(node) => scroll.setWeekRowRef(week.key, node)}
              data-calendar-week-key={week.key}
              className="grid grid-cols-7 bg-white"
            >
              {week.days.map((day, index) => {
                const selected = isSameDay(day.date, selectedDate);
                const isToday = isSameDay(day.date, today);
                const monthAnnotation = getMonthAnnotation(day.date);
                const isLastColumn = index % 7 === 6;

                // ── この日のイベントを抽出・時刻順ソート
                const sortedEvents = visibleEvents
                  .filter((e) => isSameDay(e.startsAt, day.date))
                  .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

                const visibleChips = sortedEvents.slice(0, maxVisibleChips);
                const overflowCount = sortedEvents.length - visibleChips.length;

                return (
                  <div
                    key={day.key}
                    className={cn(
                      "calendar-month-day-cell group relative h-[var(--calendar-month-row-height)] min-h-[var(--calendar-month-row-height)] overflow-visible border-b border-[#eef0f3] bg-white text-left transition-colors",
                      !isLastColumn && "border-r",
                      isToday && "bg-[#f0f6ff]",
                      selected && !isToday && "bg-[#fbfaf7]",
                      !selected && !isToday && "hover:bg-[#fbfaf7]",
                    )}
                  >
                    {/* 日付ボタン（クリックで日付選択） */}
                    <button
                      type="button"
                      aria-label={format(day.date, "yyyy年M月d日", {
                        locale: ja,
                      })}
                      aria-pressed={selected}
                      className="relative h-full w-full overflow-hidden text-left outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      onClick={() => onSelectDate(day.date)}
                    >
                      {/* 日付番号バッジ */}
                      <span
                        className={cn(
                          "absolute left-4 top-4 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[length:var(--ds-layout-font-size-meta)] font-semibold tabular-nums transition-colors",
                          isToday
                            ? "bg-[#185FA5] text-white shadow-[0_7px_18px_rgba(24,95,165,0.22)]"
                            : selected
                              ? "bg-[#f0efea] text-[#24231f] ring-1 ring-[#d8d6ce]"
                              : day.isCurrentMonth
                                ? "text-[#24231f]"
                                : "text-[#b0aea8]",
                        )}
                      >
                        {day.dayOfMonth}
                      </span>

                      {/* 月初ラベル（例: "9月"） */}
                      {monthAnnotation ? (
                        <span className="absolute right-4 top-[18px] text-[12px] font-semibold text-[#a09f98]">
                          {monthAnnotation}
                        </span>
                      ) : null}

                      {/* ── イベントチップ一覧 ── */}
                      {sortedEvents.length > 0 && (
                        <div className="absolute inset-x-1 top-14 flex flex-col gap-[3px]">
                          {visibleChips.map((event) => (
                            <MonthEventChip key={event.id} event={event} />
                          ))}
                          {overflowCount > 0 && (
                            <div className="pl-1 text-[11px] font-medium text-[#8f929c]">
                              +{overflowCount}件
                            </div>
                          )}
                        </div>
                      )}
                    </button>

                    {/* 行高リサイズハンドル */}
                    <div
                      role="separator"
                      aria-label={T.MONTH_ROW_RESIZE_ARIA_LABEL}
                      aria-orientation="horizontal"
                      aria-valuemin={C.MIN_MONTH_ROW_HEIGHT}
                      aria-valuemax={C.MAX_MONTH_ROW_HEIGHT}
                      aria-valuenow={resize.monthRowHeight}
                      tabIndex={0}
                      className="calendar-month-row-boundary-resize-handle"
                      title={T.MONTH_ROW_RESIZE_TITLE}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={resize.handleResizeReset}
                      onKeyDown={resize.handleResizeKeyDown}
                      onPointerDown={resize.handleResizePointerDown}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
