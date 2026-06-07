import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { GCalWritableEventUpdateInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import type { CalendarEventMoveHandler } from "./scheduleScreen.types";

type CalendarEventMoveOverride = { startsAt: Date; endsAt: Date; isAllDay: boolean };

<<<<<<< HEAD
type CalendarEventUpdateHandler = (accountId: string, event: GCalWritableEventUpdateInput) => Promise<Google
=======
type CalendarEventUpdateHandler = (accountId: string, event: GCalWritableEventUpdateInput) => Promise<GoogleCalendarEvent>;

type UseCalendarEventMoveControllerOptions = { updateGoogleCalendarEvent: CalendarEventUpdateHandler };

type UseCalendarEventMoveControllerReturn = { calendarEventMoveOverrides: Map<string, CalendarEventMoveOverride>; handleMoveCalendarEvent: CalendarEventMoveHandler };

const EVENT_MOVE_ROLLBACK_MS = 1200;
const EVENT_MOVE_SAVE_DELAY_MS = 120
>>>>>>> 19c2038df575f59096af6a1812131ff9e7ae7503
