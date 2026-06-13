import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { CalendarEventMoveHandler } from "./scheduleScreen.types";
import type { GCalWritableEventUpdateInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";



type CalendarEventMoveOverride = {
  startsAt: Date; endsAt: Date; isAllDay: boolean; };
type CalendarEventUpdateHandler = (accountId: string, event: GCalWritableEventUpdateInput) => Promise<GoogleCalendarEvent>;
type UseCalendarEventMoveControllerOptions = {
  updateGoogleCalendarEvent: CalendarEventUpdateHandler; };
type UseCalendarEventMoveControllerReturn = {
  calendarEventMoveOverrides: Map<string, CalendarEventMoveOverride>; handleMoveCalendarEvent: CalendarEventMoveHandler; };
type CalendarEventMoveSnapshot = {
  startsAt: Date; endsAt: Date; isAllDay: boolean; };



const EVENT_MOVE_ROLLBACK_MS = 1200;
const EVENT_MOVE_SAVE_DELAY_MS = 120;
const EVENT_MOVE_TOAST_ID_PREFIX = "calendar-event-move";



const cloneDate = (value: Date): Date => new Date(value);
const cloneMoveOverride = ({ startsAt, endsAt, isAllDay }: CalendarEventMoveOverride): CalendarEventMoveOverride => ({
  startsAt: cloneDate(startsAt),
  endsAt: cloneDate(endsAt),
  isAllDay,
});
const createMoveOverride = (startsAt: Date, endsAt: Date, isAllDay: boolean): CalendarEventMoveOverride => ({
  startsAt: cloneDate(startsAt),
  endsAt: cloneDate(endsAt),
  isAllDay,
});
const createMoveSnapshot = (event: GoogleCalendarEvent): CalendarEventMoveSnapshot => ({
  startsAt: cloneDate(event.startsAt),
  endsAt: cloneDate(event.endsAt),
  isAllDay: event.isAllDay,
});
const resolveCalendarEventMoveKey = (event: Pick<GoogleCalendarEvent, "id" | "calendarId" | "accountId">): string => `${event.accountId ?? "unknown"}:${event.calendarId}:${event.id}`;
const removeCalendarEventMoveOverride = (currentOverrides: Map<string, CalendarEventMoveOverride>, eventKey: string): Map<string, CalendarEventMoveOverride> => {
  if (!currentOverrides.has(eventKey)) return currentOverrides;

  const nextOverrides = new Map(currentOverrides);
  nextOverrides.delete(eventKey);
  return nextOverrides;
};
const upsertCalendarEventMoveOverride = (currentOverrides: Map<string, CalendarEventMoveOverride>, eventKey: string, override: CalendarEventMoveOverride): Map<string, CalendarEventMoveOverride> => {
  const currentOverride = currentOverrides.get(eventKey);

  if (
    currentOverride &&
    currentOverride.isAllDay === override.isAllDay &&
    currentOverride.startsAt.getTime() === override.startsAt.getTime() &&
    currentOverride.endsAt.getTime() === override.endsAt.getTime()
  ) {
    return currentOverrides;
  }

  const nextOverrides = new Map(currentOverrides);
  nextOverrides.set(eventKey, cloneMoveOverride(override));
  return nextOverrides;
};
const getCalendarEventMoveToastId = (eventKey: string): string => `${EVENT_MOVE_TOAST_ID_PREFIX}:${eventKey}`;
const applyCalendarEventMoveOverrides = (events: GoogleCalendarEvent[], overrides: Map<string, CalendarEventMoveOverride>): GoogleCalendarEvent[] => events.map((event) => {
  const override = overrides.get(resolveCalendarEventMoveKey(event));
  if (!override) return event;

  return {
    ...event,
    startsAt: cloneDate(override.startsAt),
    endsAt: cloneDate(override.endsAt),
    isAllDay: override.isAllDay,
  };
});
const useCalendarEventMoveController = ({ updateGoogleCalendarEvent }: UseCalendarEventMoveControllerOptions): UseCalendarEventMoveControllerReturn => {
  const [calendarEventMoveOverrides, setCalendarEventMoveOverrides] = useState<Map<string, CalendarEventMoveOverride>>(() => new Map());
  const moveOperationTokenRef = useRef(0);
  const handleMoveCalendarEventRef = useRef<CalendarEventMoveHandler>(() => undefined);
  const activeMoveTokenByEventRef = useRef(new Map<string, number>());
  const saveTimerByEventRef = useRef(new Map<string, number>());
  const releaseTimerByEventRef = useRef(new Map<string, number>());

  const clearSaveTimer = useCallback((eventKey: string) => {
    const timerId = saveTimerByEventRef.current.get(eventKey);
    if ((timerId === null || timerId === undefined)) return;

    window.clearTimeout(timerId);
    saveTimerByEventRef.current.delete(eventKey);
  }, []);

  const clearReleaseTimer = useCallback((eventKey: string) => {
    const timerId = releaseTimerByEventRef.current.get(eventKey);
    if ((timerId === null || timerId === undefined)) return;

    window.clearTimeout(timerId);
    releaseTimerByEventRef.current.delete(eventKey);
  }, []);

  const clearEventTimers = useCallback((eventKey: string) => {
    clearSaveTimer(eventKey);
    clearReleaseTimer(eventKey);
  }, [clearReleaseTimer, clearSaveTimer]);

  const releaseEventOverride = useCallback((eventKey: string, token: number) => {
    if (activeMoveTokenByEventRef.current.get(eventKey) !== token) return;

    activeMoveTokenByEventRef.current.delete(eventKey);
    clearEventTimers(eventKey);
    setCalendarEventMoveOverrides((currentOverrides) => removeCalendarEventMoveOverride(currentOverrides, eventKey));
  }, [clearEventTimers]);

  const handleMoveCalendarEvent = useCallback<CalendarEventMoveHandler>(({ event, startsAt, endsAt, isAllDay }) => {
    const accountId = event.accountId;
    if (!accountId) {
      toast.error("予定を移動できませんでした", { description: "Google Calendar アカウントが見つかりません。" });
      return;
    }

    const eventKey = resolveCalendarEventMoveKey(event);
    const nextOverride = createMoveOverride(startsAt, endsAt, isAllDay);
    const previousSnapshot = createMoveSnapshot(event);
    const operationToken = moveOperationTokenRef.current + 1;
    const toastId = getCalendarEventMoveToastId(eventKey);

    moveOperationTokenRef.current = operationToken;
    activeMoveTokenByEventRef.current.set(eventKey, operationToken);
    clearEventTimers(eventKey);
    setCalendarEventMoveOverrides((currentOverrides) => upsertCalendarEventMoveOverride(currentOverrides, eventKey, nextOverride));

    const undoMove = () => {
      handleMoveCalendarEventRef.current({
        event,
        startsAt: previousSnapshot.startsAt,
        endsAt: previousSnapshot.endsAt,
        isAllDay: previousSnapshot.isAllDay,
      });
    };

    const saveTimerId = window.setTimeout(() => {
      saveTimerByEventRef.current.delete(eventKey);

      void updateGoogleCalendarEvent(accountId, {
        calendarId: event.calendarId,
        eventId: event.id,
        startsAt: cloneDate(nextOverride.startsAt),
        endsAt: cloneDate(nextOverride.endsAt),
        isAllDay: nextOverride.isAllDay,
      }).then(() => {
        if (activeMoveTokenByEventRef.current.get(eventKey) !== operationToken) return;

        toast("予定を移動しました", {
          id: toastId,
          description: event.title ?? "Untitled",
          action: { label: "元に戻す", onClick: undoMove },
        });

        const releaseTimerId = window.setTimeout(() => {
          releaseTimerByEventRef.current.delete(eventKey);
          releaseEventOverride(eventKey, operationToken);
        }, EVENT_MOVE_ROLLBACK_MS);

        releaseTimerByEventRef.current.set(eventKey, releaseTimerId);
      }).catch((error: unknown) => {
        if (activeMoveTokenByEventRef.current.get(eventKey) !== operationToken) return;

        console.warn("[useCalendarEventMoveController] Failed to move event", error);
        releaseEventOverride(eventKey, operationToken);
        toast.error("予定を移動できませんでした", {
          id: toastId,
          description: event.title ?? "Untitled",
        });
      });
    }, EVENT_MOVE_SAVE_DELAY_MS);

    saveTimerByEventRef.current.set(eventKey, saveTimerId);
  }, [clearEventTimers, releaseEventOverride, updateGoogleCalendarEvent]);

  handleMoveCalendarEventRef.current = handleMoveCalendarEvent;

  useEffect(() => () => {
    Array.from(saveTimerByEventRef.current.values()).forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    Array.from(releaseTimerByEventRef.current.values()).forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    saveTimerByEventRef.current.clear();
    releaseTimerByEventRef.current.clear();
    activeMoveTokenByEventRef.current.clear();
  }, []);

  return {
    calendarEventMoveOverrides,
    handleMoveCalendarEvent,
  };
};



export { applyCalendarEventMoveOverrides, useCalendarEventMoveController };


export type { CalendarEventMoveOverride, UseCalendarEventMoveControllerOptions, UseCalendarEventMoveControllerReturn };
