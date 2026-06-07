import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addHours, format, startOfDay } from "date-fns";
import { toast } from "sonner";
import type { CalendarRecurrenceFrequency, CalendarRecurrenceRule, CalendarWeekday } from "@core/calendar";
import type { GoogleAccountDisplay } from "@/features/calendar/scheduleScreen.types";
import type { GCalWritableEventInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

t