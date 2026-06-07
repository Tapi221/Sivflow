import { type CSSProperties, type PointerEvent as ReactPointerEvent, type SVGProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addHours, format, startOfDay } from "date-fns";
import type { GoogleAccountDisplay, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GCalWritableEventInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type MobileCalendarWritableCalendarOption = { key: string; accountId: string; calendarId: string; label: string; accountLabel: string; calendarLabel: string; color: string; projectId?: string; isSelected: boolean };
type MobileCalendarEventFormState = { title: string; location