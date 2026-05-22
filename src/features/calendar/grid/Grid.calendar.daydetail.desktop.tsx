import { EventChipDayDetail } from "@/features/calendar/eventchip/EventChip.schedule.daydetail";
import {
  computeEventLayout,
  toLayoutEvent,
} from "@/features/calendar/eventchip/EventChip.layout.weekday.desktop";

import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";

import * as GD from "@/features/calendar/grid/grid.layout.constants.desktop";

// ==============================================

export const HOUR_ROW_HEIGHT = 48;

export const HOURS = Array.from({ length: 24 }, (_, i) => i);

const MIN_EVENT_DURATION_MINUTES = 30;
const COMPACT_EVENT_HEIGHT_PX = 34;
const EVENT_OUTER_LEFT_PX = 6;
const EVENT_OUTER_RIGHT_PX = 8;
const EVENT_COLUMN_GAP_PX = 2;
const EVENT_VERTICAL_INSET_PX = 1;
const GRID_TOP_INSET_PX = 10;
const GRID_HORIZONTAL_INSET_PX = 12;
const IOS_CALENDAR_BACKGROUND = "#f2f2f7";
const IOS_GRID_SURFACE = "rgba(255, 255, 255, 0.94)";
const IOS_SEPARATOR = "rgba(60, 60, 67, 0.14)";
const IOS_SECONDARY_SEPARATOR = "rgba(60, 60, 67, 0.06)";
const IOS_LABEL = "rgba(60, 60, 67, 0.48)";

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
  const gridHeight = timelineHeight + GRID_TOP_INSET_PX;

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
    <div
      className="flex bg-[#f2f2f7] px-1 pb-2 pt-1"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* Time */}
      <div
        className={`
          ${GD.DAY_DETAIL_TIME_LABEL_WIDTH_CLASS}
          shrink-0
        `}
        style={{
          height: gridHeight,
          background: IOS_CALENDAR_BACKGROUND,
        }}
      >
        <div style={{ height: GRID_TOP_INSET_PX }} />

        {HOURS.map((hour) => (
          <div
            key={hour}
            className="relative"
            style={{
              height: HOUR_ROW_HEIGHT,
            }}
          >
            <span
              className="
                absolute
                right-3
                top-0
                flex
                h-5
                -translate-y-1/2
                select-none
                items-center
                justify-end
                rounded-full
                px-1
                text-[11px]
                font-medium
                leading-none
                tracking-[-0.01em]
                tabular-nums
              "
              style={{
                background: IOS_CALENDAR_BACKGROUND,
                color: IOS_LABEL,
              }}
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
          overflow-hidden
          rounded-[24px]
          border
        "
        style={{
          height: gridHeight,
          background: IOS_GRID_SURFACE,
          borderColor: IOS_SEPARATOR,
          boxShadow:
            "inset 0 1px 0 rgba(255, 255, 255, 0.78), 0 8px 22px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3"
          style={{
            background:
              "linear-gradient(180deg, rgba(242, 242, 247, 0.82), rgba(242, 242, 247, 0))",
          }}
        />

        {/* Lines */}
        <div
          className="absolute inset-x-0"
          style={{
            top: GRID_TOP_INSET_PX,
            height: timelineHeight,
          }}
        >
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="relative"
              style={{
                height: HOUR_ROW_HEIGHT,
              }}
            >
              <div
                className="absolute left-0 right-0 top-0 h-px origin-top"
                style={{
                  background: hour === 0 ? IOS_SEPARATOR : IOS_SECONDARY_SEPARATOR,
                  transform: "scaleY(0.5)",
                }}
              />

              {hour < HOURS.length - 1 && (
                <div
                  className="absolute h-px origin-top"
                  style={{
                    left: GRID_HORIZONTAL_INSET_PX,
                    right: GRID_HORIZONTAL_INSET_PX,
                    top: "50%",
                    background: IOS_SECONDARY_SEPARATOR,
                    transform: "scaleY(0.5)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Events */}
        {events.map((ev) => {
          const durationMinutes = getDurationMinutes(ev);
          const height = getEventHeight(durationMinutes);
          const eventHeight = Math.max(18, height - EVENT_VERTICAL_INSET_PX * 2);
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
                top: GRID_TOP_INSET_PX + getEventTop(ev) + EVENT_VERTICAL_INSET_PX,
                height: eventHeight,
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