// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GoogleConnectedServiceAccountEntry } from "@/integration/google-integration/googleAccount.types";
import { useGoogleTaskLists } from "@/integration/googletask-integration/useGoogleTaskLists";
import { fetchGoogleTaskLists } from "@/integration/googletask-integration/gtask.api";
import { requestConnectedServiceAccessToken } from "@/integration/google-integration/google.oauth";

vi.mock("@/integration/googletask-integration/gtask.api", () => ({
  fetchGoogleTaskLists: vi.fn(),
}));

vi.mock("@/integration/google-integration/google.oauth", () => ({
  refreshConnectedServiceAccessToken: vi.fn(),
  requestConnectedServiceAccessToken: vi.fn(),
}));

vi.mock("@/integration/google-integration/google.server-oauth", () => ({
  getServerStoredGoogleConnectedServiceAccessToken: vi.fn(),
  isServerStoredGoogleOAuthEnabled: vi.fn(() => false),
}));

vi.mock("@platform/firebase/client", () => ({
  auth: {},
}));

const createConnectedAccount = (): GoogleConnectedServiceAccountEntry => ({
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

    (error as Error & { status?: number; }).status = 403;
    (error as Error & { googleReason?: string; }).googleReason =
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

  it("recovers Google Tasks list loading with a silent access token when no refresh token is stored", async () => {
    vi.mocked(requestConnectedServiceAccessToken).mockResolvedValue({
      accessToken: "silent-access-token",
      accountEmail: "akari@example.com",
      accountName: "Akari",
      accountPhotoUrl: null,
      expiresInSeconds: 3600,
    });
    vi.mocked(fetchGoogleTaskLists).mockResolvedValue([
      {
        id: "tasks-1",
        title: "My Tasks",
      },
    ]);

    const onAccessTokenRecovered = vi.fn();

    const { result } = renderHook(() =>
      useGoogleTaskLists([createConnectedAccount()], onAccessTokenRecovered),
    );

    await waitFor(() => {
      expect(result.current["account-1"]?.taskLists).toEqual([
        {
          id: "tasks-1",
          title: "My Tasks",
        },
      ]);
    });

    expect(requestConnectedServiceAccessToken).toHaveBeenCalledWith({}, true);
    expect(fetchGoogleTaskLists).toHaveBeenCalledWith("silent-access-token");
    expect(onAccessTokenRecovered).toHaveBeenCalledWith({
      accountId: "account-1",
      accessToken: "silent-access-token",
      refreshToken: null,
      accountName: "Akari",
      accountPhotoUrl: null,
      expiresInSeconds: 3600,
    });
  });
});
