import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { GCalWritableEventUpdateInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import type { CalendarEventMoveHandler } from "./scheduleScreen.types";

type CalendarEventMoveOverride = { startsAt: Date; endsAt: Date; isAllDay: boolean };

type CalendarEventUpdateHandler = (accountId: string, event: GCalWritableEventUpdateInput) => Promise<GoogleCalendarEvent>;

type UseCalendarEventMoveControllerOptions = { updateGoogleCalendarEvent: CalendarEventUpdateHandler };

type UseCalendarEventMoveControllerReturn = { calendarEventMoveOverrides: Map<string, CalendarEventMoveOverride>; handleMoveCalendarEvent: CalendarEventMoveHandler };

const EVENT_MOVE_ROLLBACK_MS = 1200;

const getCalendarEventOverrideKey = (event: GoogleCalendarEvent): string => event.id;

const getCalendarEventToastDescription = (event: GoogleCalendarEvent): string => event.title || "Untitled";

const createCalendarEventUpdateInput = (event: GoogleCalendarEvent, override: CalendarEventMoveOverride): GCalWritableEventUpdateInput => ({ calendarId: event.calendarId, eventId: event.externalId ?? event.id, startsAt: override.startsAt, endsAt: override.endsAt, isAllDay: override.isAllDay });

const isSameCalendarEventMoveOverride = (left: CalendarEventMoveOverride, right: CalendarEventMoveOverride): boolean => left.startsAt.getTime() === right.startsAt.getTime() && left.endsAt.getTime() === right.endsAt.getTime() && left.isAllDay === right.isAllDay;

const applyCalendarEventMoveOverrides = (events: GoogleCalendarEvent[], overrides: Map<string, CalendarEventMoveOverride>): GoogleCalendarEvent[] => {
  if (overrides.size === 0) return events;
  return events.map((event) => {
    const override = overrides.get(getCalendarEventOverrideKey(event));
    return override ? { ...event, ...override } : event;
  });
};

const useCalendarEventMoveController = ({ updateGoogleCalendarEvent }: UseCalendarEventMoveControllerOptions): UseCalendarEventMoveControllerReturn => {
  const [calendarEventMoveOverrides, setCalendarEventMoveOverrides] = useState<Map<string, CalendarEventMoveOverride>>(() => new Map());

  const clearMatchingCalendarEventMoveOverride = useCallback((overrideKey: string, expectedOverride: CalendarEventMoveOverride) => {
    setCalendarEventMoveOverrides((overrides) => {
      const current = overrides.get(overrideKey);
      if (!current || !isSameCalendarEventMoveOverride(current, expectedOverride)) return overrides;
      const next = new Map(overrides);
      next.delete(overrideKey);
      return next;
    });
  }, []);

  const handleMoveCalendarEvent = useCallback<CalendarEventMoveHandler>(async ({ event, startsAt, endsAt, isAllDay }) => {
    const accountId = event.accountId;
    if (!accountId) return;

    const overrideKey = getCalendarEventOverrideKey(event);
    const nextOverride = { startsAt, endsAt, isAllDay };
    const rollbackOverride = { startsAt: event.startsAt, endsAt: event.endsAt, isAllDay: event.isAllDay };

    setCalendarEventMoveOverrides((overrides) => {
      const next = new Map(overrides);
      next.set(overrideKey, nextOverride);
      return next;
    });

    try {
      await updateGoogleCalendarEvent(accountId, createCalendarEventUpdateInput(event, nextOverride));
      clearMatchingCalendarEventMoveOverride(overrideKey, nextOverride);
      toast("予定を移動しました", {
        description: getCalendarEventToastDescription(event),
        action: {
          label: "元に戻す",
          onClick: () => {
            setCalendarEventMoveOverrides((overrides) => {
              const next = new Map(overrides);
              next.set(overrideKey, rollbackOverride);
              return next;
            });
            void updateGoogleCalendarEvent(accountId, createCalendarEventUpdateInput(event, rollbackOverride)).then(() => {
              clearMatchingCalendarEventMoveOverride(overrideKey, rollbackOverride);
              toast("予定を元に戻しました", { description: getCalendarEventToastDescription(event) });
            }).catch((undoError: unknown) => {
              console.warn("[ScheduleScreen] calendar event move undo failed", undoError);
              setCalendarEventMoveOverrides((overrides) => {
                const next = new Map(overrides);
                next.set(overrideKey, nextOverride);
                return next;
              });
              toast.error("予定を元に戻せませんでした", { description: getCalendarEventToastDescription(event) });
            });
          },
        },
      });
    } catch (error) {
      console.warn("[ScheduleScreen] calendar event move failed", error);
      toast.error("予定の移動に失敗しました", { description: getCalendarEventToastDescription(event) });
      setCalendarEventMoveOverrides((overrides) => {
        const next = new Map(overrides);
        next.set(overrideKey, rollbackOverride);
        return next;
      });
      window.setTimeout(() => {
        clearMatchingCalendarEventMoveOverride(overrideKey, rollbackOverride);
      }, EVENT_MOVE_ROLLBACK_MS);
    }
  }, [clearMatchingCalendarEventMoveOverride, updateGoogleCalendarEvent]);

  return { calendarEventMoveOverrides, handleMoveCalendarEvent };
};

export { applyCalendarEventMoveOverrides, useCalendarEventMoveController };
export type { CalendarEventMoveOverride, CalendarEventUpdateHandler, UseCalendarEventMoveControllerOptions, UseCalendarEventMoveControllerReturn };
