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

import { diagnoseGoogleOAuthReconnectCause, toUserTransparentAutoRecoveryError } from "@/features/calendar/googlecalendar-integration/gcal.server-oauth";

const callableError = (reason: string, code = "functions/failed-precondition") => {
  const error = new Error("callable failed") as Error & { code?: string; details?: unknown };
  error.code = code;
  error.details = { reason };
  return error;
};

describe("Google Calendar server OAuth callable errors", () => {
  it("treats invalid_grant as a reconnect-required user action", () => {
    const diagnosis = diagnoseGoogleOAuthReconnectCause(callableError("invalid_grant"));

    expect(diagnosis.reconnectRequired).toBe(true);
    expect(diagnosis.action).toContain("再連携");
  });

  it("does not tell users to reconnect for server OAuth configuration errors", () => {
    const diagnosis = diagnoseGoogleOAuthReconnectCause(callableError("server_oauth_configuration"));
    const userError = toUserTransparentAutoRecoveryError(callableError("server_oauth_configuration"));

    expect(diagnosis.reconnectRequired).toBe(false);
    expect(userError.message).toContain("Firebase Functions secrets");
    expect((userError as Error & { code?: string }).code).toBe("server-oauth-configuration-error");
  });

  it("does not tell users to reconnect when stored tokens cannot be decrypted", () => {
    const diagnosis = diagnoseGoogleOAuthReconnectCause(callableError("stored_refresh_token_decrypt_failed"));
    const userError = toUserTransparentAutoRecoveryError(callableError("stored_refresh_token_decrypt_failed"));

    expect(diagnosis.reconnectRequired).toBe(false);
    expect(userError.message).toContain("復号できません");
    expect((userError as Error & { code?: string }).code).toBe("server-stored-token-decrypt-error");
  });
});
