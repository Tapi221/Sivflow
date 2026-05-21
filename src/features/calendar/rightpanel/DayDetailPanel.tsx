import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { useLayoutEffect, useRef } from "react";

import {
  GridCalendarDayDetailDesktop,
  HOUR_ROW_HEIGHT,
} from "@/features/calendar/grid/Grid.calendar.daydetail.desktop";

import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";

import { DayDetailCreateButton } from "@/features/calendar/chip/AddScheduleButton.daydetail";

import { eventChipAllDayClass } from "@/features/calendar/eventchip/eventchip.allday.styles";

import { generateColorTokens } from "@/features/calendar/ui/calendar.color-tokens";

import { cn } from "@/lib/utils";

// ==============================================

const DEFAULT_SCROLL_HOUR = 0;

// ==============================================

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
      className={cn(
        eventChipAllDayClass,
        "truncate",
      )}
      style={{
        background: tokens.bg,
        color: tokens.text,
      }}
    >
      {event.title || "Untitled"}
    </div>
  );
};

// ==============================================

export type DayDetailPanelProps = {
  selectedDate: Date;
  events: GoogleCalendarEvent[];
  onClose?: () => void;
};

// ==============================================

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
        w-[260px]
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
          px-4
          pt-5
          pb-3
        "
      >
        <span
          className="
            text-[14px]
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
              w-[30px]
              shrink-0
              justify-end
              pr-1
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
              px-2
              py-1.5
            "
          >
            <div className="flex flex-col gap-1">
              {allDayEvents.map((ev) => (
                <AllDayChip
                  key={ev.id}
                  event={ev}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <GridCalendarDayDetailDesktop
          events={timedEvents}
        />
      </div>

      {/* Footer */}
      <div
        className="
          border-t
          border-[#f5f5f5]
          px-4
          py-4
        "
      >
        <DayDetailCreateButton />
      </div>
    </aside>
  );
};