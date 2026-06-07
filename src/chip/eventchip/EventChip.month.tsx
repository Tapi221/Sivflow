import type { CSSProperties } from "react";
import { memo, useMemo } from "react";
import { format } from "date-fns";
import { eventChipAllDayClass } from "./eventchip.allday.styles";
import { HoverMonthEventTooltip } from "@/chip/toolchip/HoverMonthEventTooltip";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils"