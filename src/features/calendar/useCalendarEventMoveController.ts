import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { GCalWritableEventUpdateInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import type { CalendarEventMoveHandler } from "./scheduleScreen.types";

type CalendarEventMoveOverride = { startsAt: Date; endsAt: Date; isAllDay: boolean };

type CalendarEventUpdateHandler = (accountId: string, event: GCalWritableEventUpdateInput) => Promise<Google