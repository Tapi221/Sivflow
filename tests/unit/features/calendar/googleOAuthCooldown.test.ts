import { describe, expect, it, vi } from "vitest";

vi.mock("@/platform/runtimeKind", () => ({
  isDesktopLikeRuntime: () => false,
}));

vi.mock("@/services/firebase", () => ({
  auth: {
    authStateReady: () => Promise.resolve(),
    currentUser: { uid: "user-1" },
  },
  functionsClient: {},
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: () => vi.fn(),
}));

import { createGoogleOAuthCooldownError, GOOGLE_OAUTH_DETERMINISTIC_ERROR_COOLDOWN_MS, shouldCooldownGoogleOAuthError, toGoogleCalendarAuthErrorMessage } from "@/features/calendar/googlecalendar-integration/useMultiAccountGoogleCalendar";

const errorWithReason = (reason: string) => {
  const error = new Error("source") as Error & { googleOAuthReason?: string };
  error.googleOAuthReason = reason;
  return error;
};

describe("Google Calendar OAuth retry cooldown helpers", () => {
  it("決定的な OAuth 失敗を cooldown 対象にする", () => {
    expect(shouldCooldownGoogleOAuthError(errorWithReason("invalid_grant"))).toBe(true);
    expect(shouldCooldownGoogleOAuthError(errorWithReason("server_oauth_configuration"))).toBe(true);
    expect(shouldCooldownGoogleOAuthError(errorWithReason("token_endpoint_failed"))).toBe(false);
  });

  it("cooldown error を元の OAuth reason 付きで分類する", () => {
    const error = createGoogleOAuthCooldownError({
      reason: "stored_refresh_token_missing",
      message: "cooldown",
      until: Date.now() + GOOGLE_OAUTH_DETERMINISTIC_ERROR_COOLDOWN_MS,
    });

    expect(toGoogleCalendarAuthErrorMessage(error)).toContain("サードパーティ連携");
  });
});
