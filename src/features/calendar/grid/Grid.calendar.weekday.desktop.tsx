import type { CSSProperties } from "react";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarDateButton, CalendarDateContent } from "@/chip/button/GridHeader.scheduletimeline";
import { eventChipAllDayClass } from "@/chip/eventchip/eventchip.allday.styles";
import { CalendarEventChipWeekday } from "@/chip/eventchip/EventChip.weekday";
import { computeEventLayout, toLayoutEvent } from "@/chip/eventchip/EventChip.weekday.placement";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { CalendarWeekDayGridProps } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import { buildScheduleVirtualRailDays } from "./ScheduleColumn.shared";
import * as COLOR from "./grid.color.constants.desktop";
import * as GRID from "./grid.layout.constants.desktop";

type CalendarEventPositionStyle = CSSProperties & {
  "--calendar-event-start-hour": number;
  "--calendar-event-start-minute": number;
  "--calendar-event-duration-minutes": number;
};

export type CalendarWeekDayGridRef = {
  scrollToHour: (hour: number) => void;
};