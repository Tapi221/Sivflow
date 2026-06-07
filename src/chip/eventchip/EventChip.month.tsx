import { createElement as h, memo } from "react";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type Props = { event: GoogleCalendarEvent };

const CalendarEventChipMonth = memo(({ event }: Props) => h("div", { className: "calendar-event-chip-month flex w-full min-w-0 items-center", "data-calendar-event-chip": "month" }, event.title));

export { CalendarEventChipMonth };
