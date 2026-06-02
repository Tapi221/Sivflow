// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyCalendarEventMoveOverrides, useCalendarEventMoveController } from "@/features/calendar/useCalendarEventMoveController";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type ToastOptions = { action?: { onClick?: () => void }; duration?: number };

const { toastMock, toastErrorMock, toastLoadingMock, toastSuccessMock } = vi.hoisted(() => ({ toastMock: vi.fn(), toastErrorMock: vi.fn(), toastLoadingMock: vi.fn(() => "move-toast-id"), toastSuccessMock: vi.fn() }));

const ACCOUNT_ID = "account-1";
const CALENDAR_ID = "calendar-1";
const EVENT_MOVE_TOAST_DURATION_MS = 5000;
const ORIGINAL_START = new Date(2026, 5, 1, 9, 0);
const ORIGINAL_END = new Date(2026, 5, 1, 10, 0);
const MOVED_START = new Date(2026, 5, 2, 11, 0);
const MOVED_END = new Date(2026, 5, 2, 12, 0);

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
  toast: Object.assign(toastMock, { error: toastErrorMock, loading: toastLoadingMock, success: toastSuccessMock }),
}));

describe("useCalendarEventMoveController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("moves the event, shows an auto-dismiss success toast, and undoes through Google Calendar update", async () => {
    const updateGoogleCalendarEvent = vi.fn(async (_accountId, updateEvent) => ({ ...createGoogleCalendarEvent(), startsAt: updateEvent.startsAt, endsAt: updateEvent.endsAt, isAllDay: updateEvent.isAllDay }));
    const { result } = renderHook(() => useCalendarEventMoveController({ updateGoogleCalendarEvent }));
    const event = createGoogleCalendarEvent();

    await act(async () => {
      await result.current.handleMoveCalendarEvent({ event, startsAt: MOVED_START, endsAt: MOVED_END, isAllDay: false });
    });

    expect(updateGoogleCalendarEvent).toHaveBeenCalledWith(ACCOUNT_ID, { calendarId: CALENDAR_ID, eventId: "external-event-1", startsAt: MOVED_START, endsAt: MOVED_END, isAllDay: false });
    expect(toastLoadingMock).toHaveBeenCalledWith("予定を移動しています", { description: "変更を保存しています" });
    expect(toastSuccessMock).toHaveBeenCalledWith("予定を移動しました", expect.objectContaining({ id: "move-toast-id", description: "元に戻すことができます", duration: EVENT_MOVE_TOAST_DURATION_MS }));
    expect(applyCalendarEventMoveOverrides([event], result.current.calendarEventMoveOverrides)[0]?.startsAt).toBe(ORIGINAL_START);

    const toastOptions = toastSuccessMock.mock.calls[0]?.[1] as ToastOptions;

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

  it("keeps a rollback override and shows an auto-dismiss error toast when moving fails", async () => {
    const updateGoogleCalendarEvent = vi.fn(async () => {
      throw new Error("move failed");
    });
    const { result } = renderHook(() => useCalendarEventMoveController({ updateGoogleCalendarEvent }));
    const event = createGoogleCalendarEvent();

    await act(async () => {
      await result.current.handleMoveCalendarEvent({ event, startsAt: MOVED_START, endsAt: MOVED_END, isAllDay: false });
    });

    expect(toastErrorMock).toHaveBeenCalledWith("予定の移動に失敗しました", { id: "move-toast-id", description: "移動前の日時に戻しました", duration: EVENT_MOVE_TOAST_DURATION_MS });
    expect(applyCalendarEventMoveOverrides([{ ...event, startsAt: MOVED_START, endsAt: MOVED_END }], result.current.calendarEventMoveOverrides)[0]?.startsAt).toBe(ORIGINAL_START);
  });
});
