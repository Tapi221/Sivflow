import { EventChipDayDetail } from "@/features/calendar/eventchip/EventChip.daidetail";

import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";

// ==============================================

export const HOUR_ROW_HEIGHT = 40;

export const HOURS = Array.from(
  { length: 24 },
  (_, i) => i,
);

// ==============================================

type Props = {
  events: GoogleCalendarEvent[];
};

// ==============================================

export const GridCalendarDayDetailDesktop =
  ({ events }: Props) => {
    return (
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
                border-t
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
                  top-[-6px]
                  bg-white
                  px-[2px]
                  text-[10px]
                  leading-none
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
                border-t
                border-[#f7f7f7]
              "
              style={{
                height:
                  HOUR_ROW_HEIGHT,
              }}
            />
          ))}

          {/* Events */}
          {events.map((ev) => (
            <EventChipDayDetail
              key={ev.id}
              event={ev}
            />
          ))}
        </div>
      </div>
    );
  };