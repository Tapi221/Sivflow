import type { CSSProperties } from "react";
import { format } from "date-fns";
import { HoverMonthEventTooltip } from "@/chip/toolchip/HoverMonthEventTooltip";
import { eventChipDesign } from "./eventChipDesign.generated";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

型定義