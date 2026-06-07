import { createElement, memo } from "react";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type CalendarEventChipMonthProps = { event: GoogleCalendarEvent; showTimeLabel?: boolean; tooltipDisabled?: boolean };

const CalendarEventChipMonth = memo(({ event }: CalendarEventChipMonthProps) => createElement("div", { "data-calendar-event-chip": "month", className: "calendar-event-chip-month flex w-full min-w-0 items-center" }, event.title || "Unt