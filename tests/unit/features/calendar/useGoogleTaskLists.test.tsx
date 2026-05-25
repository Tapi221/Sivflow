import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GoogleAccountEntry } from "../../../../src/features/calendar/googlecalendar-integration/useMultiAccountGoogleCalendar";
import { useGoogleTaskLists } from "../../../../src/features/calendar/googlecalendar-integration/useGoogleTaskLists";
import { fetchGoogleTaskLists } from "../../../../src/features/calendar/googlecalendar-integration/gcal.api";

vi.mock("../../../../src/features/calendar/googlecalendar-integration/gcal.api", () => ({
  fetchGoogleTaskLists: vi.fn(),
}));

vi.mock("../../../../src/features/calendar/googlecalendar-integration/gcal.oauth", () => ({
  refreshCalendarAccessToken: vi.fn(),
}));

vi.mock("../../../../src/features/calendar/googlecalendar-integration/gcal.server-oauth", () => ({
  getServerStoredGoogleCalendarAccessToken: vi.fn(),
  isServerStoredGoogleOAuthEnabled: vi.fn(() => false),
}));

const createConnectedAccount = (): GoogleAccountEntry => ({
  id: "account-1",
  email: "akari@example.com",
  name: "Akari",
  photoUrl: null,
  accessToken: "access-token",
  refreshToken: null,
  calendars: [],
  selectedCalendarIds: new Set(),
  syncState: "idle",
  connectionStatus: "connected",
  lastSyncedAt: null,
  isConnecting: false,
  error: null,
});

describe("useGoogleTaskLists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a reconnectable permission error instead of treating missing Google Tasks scope as an empty list", async () => {
    const error = new Error("Request had insufficient authentication scopes.");

    (error as Error & { status?: number }).status = 403;
    (error as Error & { googleReason?: string }).googleReason =
      "insufficientPermissions";
    vi.mocked(fetchGoogleTaskLists).mockRejectedValue(error);

    const { result } = renderHook(() =>
      useGoogleTaskLists([createConnectedAccount()]),
    );

    await waitFor(() => {
      expect(result.current["account-1"]?.error).toBe(
        "Google ToDo の権限が不足しています。再連携してください。",
      );
    });

    expect(result.current["account-1"]?.taskLists).toEqual([]);
    expect(result.current["account-1"]?.isLoading).toBe(false);
  });
});
