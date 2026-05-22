import { EventChipDayDetail } from "@/features/calendar/eventchip/EventChip.schedule.daydetail";
import {
  computeEventLayout,
  toLayoutEvent,
} from "@/features/calendar/eventchip/EventChip.layout.weekday.desktop";

import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";

import * as GD from "@/features/calendar/grid/grid.layout.constants.desktop";

// ==============================================

export const HOUR_ROW_HEIGHT = 40;

export const HOURS = Array.from({ length: 24 }, (_, i) => i);

const MIN_EVENT_DURATION_MINUTES = 30;
const COMPACT_EVENT_HEIGHT_PX = 34;
const EVENT_OUTER_LEFT_PX = 6;
const EVENT_OUTER_RIGHT_PX = 8;
const EVENT_COLUMN_GAP_PX = 2;
const MONTH_VIEW_DIVIDER_BORDER_CLASS = "border-[#eef0f3]";

// ==============================================

type Props = {
  events: GoogleCalendarEvent[];
};

const getStartMinutes = (event: GoogleCalendarEvent): number => {
  const d = new Date(event.startsAt);

  return d.getHours() * 60 + d.getMinutes();
};

const getDurationMinutes = (event: GoogleCalendarEvent): number => {
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  const diff = end - start;

  return diff > 0 ? Math.max(MIN_EVENT_DURATION_MINUTES, diff / 60000) : MIN_EVENT_DURATION_MINUTES;
};

const getEventTop = (event: GoogleCalendarEvent): number =>
  (getStartMinutes(event) / 60) * HOUR_ROW_HEIGHT;

const getEventHeight = (durationMinutes: number): number =>
  (durationMinutes / 60) * HOUR_ROW_HEIGHT;

// ==============================================

export const GridCalendarDayDetailDesktop = ({ events }: Props) => {
  const timelineHeight = HOURS.length * HOUR_ROW_HEIGHT;

  const layout = computeEventLayout(
    events.map((event) =>
      toLayoutEvent(
        event.id,
        new Date(event.startsAt),
        getDurationMinutes(event),
      ),
    ),
  );

  return (
    <div className="flex">
      {/* Time */}
      <div
        className={`
          ${GD.DAY_DETAIL_TIME_LABEL_WIDTH_CLASS}
          shrink-0
        `}
        style={{
          height: timelineHeight,
        }}
      >
        {HOURS.map((hour) => (
          <div
            key={hour}
            className={`
              relative
              border-t
              ${MONTH_VIEW_DIVIDER_BORDER_CLASS}
            `}
            style={{
              height: HOUR_ROW_HEIGHT,
            }}
          >
            <span
              className="
                absolute
                right-5
                top-0
                flex
                h-6
                -translate-y-1/2
                select-none
                items-center
                justify-end
                bg-transparent
                px-[2px]
                text-[12px]
                font-semibold
                tabular-nums
                text-[#b8bcc5]
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
          height: timelineHeight,
        }}
      >
        {/* Lines */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            className={`
              border-t
              ${MONTH_VIEW_DIVIDER_BORDER_CLASS}
            `}
            style={{
              height: HOUR_ROW_HEIGHT,
            }}
          />
        ))}

        {/* Events */}
        {events.map((ev) => {
          const durationMinutes = getDurationMinutes(ev);
          const height = getEventHeight(durationMinutes);
          const position = layout.get(ev.id) ?? { left: 0, width: 1 };
          const leftInset = position.left === 0 ? EVENT_OUTER_LEFT_PX : EVENT_COLUMN_GAP_PX;
          const rightInset =
            position.left + position.width >= 1
              ? EVENT_OUTER_RIGHT_PX
              : EVENT_COLUMN_GAP_PX;

          return (
            <div
              key={ev.id}
              className="absolute min-h-0 overflow-hidden"
              style={{
                top: getEventTop(ev),
                height,
                left: `calc(${position.left * 100}% + ${leftInset}px)`,
                width: `calc(${position.width * 100}% - ${leftInset + rightInset}px)`,
              }}
            >
              <EventChipDayDetail
                event={ev}
                compact={height < COMPACT_EVENT_HEIGHT_PX || position.width < 0.5}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};