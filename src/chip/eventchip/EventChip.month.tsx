import type { CSSProperties } from "react";
import { memo, useMemo } from "react";
import { format } from "date-fns";
import { eventChipAllDayClass } from "./eventchip.allday.styles";
import { HoverMonthEventTooltip } from "@/chip/toolchip/HoverMonthEventTooltip";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

<<<<<<< HEAD
type CalendarEventChipMonthProps
=======
type Props = { event: GoogleCalendarEvent; showTimeLabel?: boolean; tooltipDisabled?: boolean };

const CalendarEventChipMonth = memo(({ event }: Props) => createElement("div", { className: "calendar-event-chip-month flex w-full min-w-0 items-center", "data-calendar-event-chip": "month" }, event.title));

CalendarEventChipMonth.displayName = "Calendar
>>>>>>> 1f6ea87419625a8a69a2235eb47209e31e6d5aa7
