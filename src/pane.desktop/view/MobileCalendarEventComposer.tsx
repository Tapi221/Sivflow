import { useCallback, useEffect, useMemo, useState } from "react";
import { addHours, format, startOfDay } from "date-fns";
import type { GoogleAccountDisplay, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GCalWritableEventInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type MobileCalendarWritableCalendarOption = { key: string; accountId: string; calendarId: string; label: string; projectId?: string };

type