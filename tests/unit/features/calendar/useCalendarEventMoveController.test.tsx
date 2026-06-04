// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyCalendarEventMoveOverrides, useCalendarEventMoveController } from "@/features/calendar/useCalendarEventMoveController";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (reason?: unknown) => void };

type ToastOptions = { action?: { onClick?: () => void }; duration?: number; description?: string; id?: string };

const { toastMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({ toastMock: vi.fn(), toastErrorMock: vi.fn(), toastSuccessMock: vi.fn(() => "move-toast-id") }));

const ACCOUNT_ID = "account-1";
const CALENDAR_ID = "calendar-1";
const EVENT_MOVE_SAVING_TOAST_DURATION_MS = Number.POSITIVE_INFINITY;
const EVENT_MOVE_TOAST_DURATION_MS = 5000;
const ORIGINAL_START = new Date(2026, 5, 1, 9, 0);
const ORIGINAL_END = new Date(2026, 5, 1, 10, 0);
const MOVED_START = new Date(2026, 5, 2, 11, 0);
const MOVED_END = new Date(2026, 5, 2, 12, 0);

const createDeferred = <T,>(): Deferred<T> => {
  let resolveDeferred: ((value: T) => void) | undefined;
  let rejectDeferred: ((reason?: unknown) => void) | undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolveDeferred = resolve;
    rejectDeferred = reject;
  });
  if (!resolveDeferred || !rejectDeferred) throw new Error("Failed to create deferred promise");
  return { promise, resolve: resolveDeferred, reject: rejectDeferred };
};

const createGoogleCalendarEvent = (): GoogleCalendarEvent => ({
  id: "event-1",
  externalId: "external-event-1",
  accountId: ACCOUNT_ID,
  calendarId: CALENDAR_ID,
  title: "移動テスト",
  startsAt: ORIGINAL_START,
  endsAt: ORIGINAL_END,
  isAllDay: false,
  accentColor: "#0ea5e9",
});

vi.mock("sonner", () => ({
  toast: Object.assign(toastMock, { error: toastErrorMock, success: toastSuccessMock }),
}));

describe("useCalendarEventMoveController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically moves the event, keeps a saving toast, then replaces it with the undoable saved toast", async () => {
    const movedEvent = { ...createGoogleCalendarEvent(), startsAt: MOVED_START, endsAt: MOVED_END, isAllDay: false };
    const moveDeferred = createDeferred<GoogleCalendarEvent>();
    const updateGoogleCalendarEvent = vi.fn(() => moveDeferred.promise);
    const { result } = renderHook(() => useCalendarEventMoveController({ updateGoogleCalendarEvent }));
    const event = createGoogleCalendarEvent();
    let moveTask = Promise.resolve();

    act(() => {
      moveTask = result.current.handleMoveCalendarEvent({ event, startsAt: MOVED_START, endsAt: MOVED_END, isAllDay: false }) as Promise<void>;
    });

    expect(updateGoogleCalendarEvent).toHaveBeenCalledWith(ACCOUNT_ID, { calendarId: CALENDAR_ID, eventId: "external-event-1", startsAt: MOVED_START, endsAt: MOVED_END, isAllDay: false });
    expect(toastSuccessMock).toHaveBeenCalledWith("予定を移動しました", { description: "変更を保存しています", duration: EVENT_MOVE_SAVING_TOAST_DURATION_MS });
    expect(applyCalendarEventMoveOverrides([event], result.current.calendarEventMoveOverrides)[0]?.startsAt).toBe(MOVED_START);

    await act(async () => {
      moveDeferred.resolve(movedEvent);
      await moveTask;
    });

    expect(toastSuccessMock).toHaveBeenCalledWith("予定を移動しました", expect.objectContaining({ id: "move-toast-id", description: "元に戻すことができます", duration: EVENT_MOVE_TOAST_DURATION_MS }));
    expect(applyCalendarEventMoveOverrides([event], result.current.calendarEventMoveOverrides)[0]?.startsAt).toBe(ORIGINAL_START);

    const toastOptions = toastSuccessMock.mock.calls[1]?.[1] as ToastOptions;

    act(() => {
      toastOptions.action?.onClick?.();
    });

    await waitFor(() => {
      expect(updateGoogleCalendarEvent).toHaveBeenCalledWith(ACCOUNT_ID, { calendarId: CALENDAR_ID, eventId: "external-event-1", startsAt: ORIGINAL_START, endsAt: ORIGINAL_END, isAllDay: false });
    });
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("予定を元に戻しました", { description: "移動前の日時に戻しました", duration: EVENT_MOVE_TOAST_DURATION_MS });
    });
  });

  it("keeps a rollback override and replaces the saving toast with an error toast when moving fails", async () => {
    const updateGoogleCalendarEvent = vi.fn(async () => {
      throw new Error("move failed");
    });
    const { result } = renderHook(() => useCalendarEventMoveController({ updateGoogleCalendarEvent }));
    const event = createGoogleCalendarEvent();

    await act(async () => {
      await result.current.handleMoveCalendarEvent({ event, startsAt: MOVED_START, endsAt: MOVED_END, isAllDay: false });
    });

    expect(toastSuccessMock).toHaveBeenCalledWith("予定を移動しました", { description: "変更を保存しています", duration: EVENT_MOVE_SAVING_TOAST_DURATION_MS });
    expect(toastErrorMock).toHaveBeenCalledWith("予定の移動に失敗しました", { id: "move-toast-id", description: "移動前の日時に戻しました", duration: EVENT_MOVE_TOAST_DURATION_MS });
    expect(applyCalendarEventMoveOverrides([{ ...event, startsAt: MOVED_START, endsAt: MOVED_END }], result.current.calendarEventMoveOverrides)[0]?.startsAt).toBe(ORIGINAL_START);
  });
});