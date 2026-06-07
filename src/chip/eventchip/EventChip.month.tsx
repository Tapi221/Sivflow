import { createElement, memo } from "react";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type Props = { event: GoogleCalendarEvent; showTimeLabel?: boolean; tooltipDisabled?: boolean };

const CalendarEventChipMonth = memo(({ event }: Props) => createElement("div", { className: "calendar-event-chip-month flex w-full min-w-0 items-center", "data-calendar-event-chip": "month" }, event.title));

CalendarEventChipMonth.displayName = "Calendar