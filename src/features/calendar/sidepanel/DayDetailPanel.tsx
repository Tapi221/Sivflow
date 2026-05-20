/**
 * DayDetailPanel.tsx
 * 画像完全寄せ版
 */

import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { useLayoutEffect, useRef } from "react";

import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { generateColorTokens } from "@/features/calendar/ui/calendar.color-tokens";

// ─────────────────────────────────────────────

const HOUR_ROW_HEIGHT = 40;

const HOURS = Array.from(
  { length: 24 },
  (_, i) => i,
);

const DEFAULT_SCROLL_HOUR = 0;

// ─────────────────────────────────────────────

const getStartMinutes = (
  event: GoogleCalendarEvent,
): number => {
  const d = new Date(event.startsAt);

  return (
    d.getHours() * 60 +
    d.getMinutes()
  );
};

const getDurationMinutes = (
  event: GoogleCalendarEvent,
): number => {
  const start = new Date(
    event.startsAt,
  ).getTime();

  const end = new Date(
    event.endsAt,
  ).getTime();

  const diff = end - start;

  return diff > 0
    ? Math.max(30, diff / 60000)
    : 30;
};

// ─────────────────────────────────────────────

const AllDayChip = ({
  event,
}: {
  event: GoogleCalendarEvent;
}) => {
  const tokens = generateColorTokens(
    event.accentColor,
  );

  return (
    <div
      className="truncate rounded-[4px] px-2 py-[5px] text-[11px] font-medium"
      style={{
        background: tokens.bg,
        color: tokens.text,
      }}
    >
      {event.title}
    </div>
  );
};

// ─────────────────────────────────────────────

const TimedEventChip = ({
  event,
}: {
  event: GoogleCalendarEvent;
}) => {
  const tokens = generateColorTokens(
    event.accentColor,
  );

  const startMin =
    getStartMinutes(event);

  const top =
    (startMin / 60) *
    HOUR_ROW_HEIGHT;

  const timeLabel = format(
    new Date(event.startsAt),
    "H:mm",
  );

  return (
    <div
      className="absolute left-[6px] right-[8px] overflow-hidden rounded-[4px] px-2 py-[5px]"
      style={{
        top,
        background: tokens.bg,
        color: tokens.text,
      }}
    >
      <span className="truncate text-[11px] font-medium leading-none">
        {timeLabel}{" "}
        {event.title}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────

export type DayDetailPanelProps = {
  selectedDate: Date;
  events: GoogleCalendarEvent[];
  onClose?: () => void;
};

// ─────────────────────────────────────────────

export const DayDetailPanel = ({
  selectedDate,
  events,
  onClose,
}: DayDetailPanelProps) => {
  const scrollRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const prevDateKeyRef =
    useRef("");

  const dateKey = format(
    selectedDate,
    "yyyy-MM-dd",
  );

  useLayoutEffect(() => {
    if (
      prevDateKeyRef.current ===
      dateKey
    ) {
      return;
    }

    prevDateKeyRef.current =
      dateKey;

    const el = scrollRef.current;

    if (!el) return;

    el.scrollTop =
      DEFAULT_SCROLL_HOUR *
      HOUR_ROW_HEIGHT;
  }, [dateKey]);

  const allDayEvents = events.filter(
    (e) =>
      e.isAllDay &&
      isSameDay(
        new Date(e.startsAt),
        selectedDate,
      ),
  );

  const timedEvents = events.filter(
    (e) =>
      !e.isAllDay &&
      isSameDay(
        new Date(e.startsAt),
        selectedDate,
      ),
  );

  return (
    <aside
      className="
        flex
        w-[320px]
        shrink-0
        flex-col
        overflow-hidden
        border-l
        border-[#ececec]
        bg-white
      "
    >
      {/* Header */}
      <div
        className="
          flex
          items-center
          justify-between
          px-6
          pt-6
          pb-4
        "
      >
        <span
          className="
            text-[15px]
            font-semibold
            text-[#3f3f46]
          "
        >
          {format(
            selectedDate,
            "yyyy年M月d日(E)",
            {
              locale: ja,
            },
          )}
        </span>

        <button
          type="button"
          onClick={onClose}
          className="
            flex
            h-7
            w-7
            items-center
            justify-center
            rounded-full
            text-[#b4b4bc]
            hover:bg-[#f5f5f5]
          "
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="h-4 w-4"
          >
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Scroll */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {/* All Day */}
        <div
          className="
            flex
            border-b
            border-[#f5f5f5]
          "
        >
          {/* Label */}
          <div
            className="
              flex
              w-[36px]
              shrink-0
              justify-end
              pr-2
              pt-[8px]
            "
          >
            <span
              className="
                text-[10px]
                font-medium
                text-[#b6b6be]
              "
            >
              終日
            </span>
          </div>

          {/* Events */}
          <div
            className="
              flex-1
              px-3
              py-1.5
            "
          >
            {allDayEvents.map((ev) => (
              <AllDayChip
                key={ev.id}
                event={ev}
              />
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex">
          {/* Time */}
          <div
            className="
              w-[36px]
              shrink-0
            "
            style={{
              height:
                HOURS.length *
                HOUR_ROW_HEIGHT,
            }}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="
                  relative
                  border-b
                  border-[#f7f7f7]
                "
                style={{
                  height:
                    HOUR_ROW_HEIGHT,
                }}
              >
                <span
                  className="
                    absolute
                    right-2
                    top-[-7px]
                    text-[10px]
                    font-medium
                    text-[#b6b6be]
                  "
                >
                  {hour}:00
                </span>
              </div>
            ))}
          </div>

          {/* Content */}
          <div
            className="
              relative
              flex-1
            "
            style={{
              height:
                HOURS.length *
                HOUR_ROW_HEIGHT,
            }}
          >
            {/* Lines */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="
                  border-b
                  border-[#f7f7f7]
                "
                style={{
                  height:
                    HOUR_ROW_HEIGHT,
                }}
              />
            ))}

            {/* Events */}
            {timedEvents.map((ev) => (
              <TimedEventChip
                key={ev.id}
                event={ev}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="
          border-t
          border-[#f5f5f5]
          px-6
          py-5
        "
      >
        <button
          type="button"
          className="
            flex
            h-[38px]
            w-full
            items-center
            justify-center
            gap-1.5
            rounded-md
            bg-[#f5f6fa]
            text-[13px]
            font-medium
            text-[#8b8fa3]
            transition-colors
            hover:bg-[#eceef5]
          "
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="h-4 w-4"
          >
            <path
              d="M8 3V13M3 8H13"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>

          <span>
            新しい予定を作成
          </span>
        </button>
      </div>
    </aside>
  );
};