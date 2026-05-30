import { describe, expect, it } from "vitest";
import { classifyGoogleTokenEndpointFailure } from "../../../functions/src/gcal/tokenErrors";

describe("classifyGoogleTokenEndpointFailure", () => {
  it("classifies invalid_grant as reconnect-required failed-precondition", () => {
    const result = classifyGoogleTokenEndpointFailure({
      context: "refresh_token",
      status: 400,
      googleError: "invalid_grant",
      description: "Bad Request",
    });

    expect(result.code).toBe("failed-precondition");
    expect(result.details.reason).toBe("invalid_grant");
    expect(result.details.reconnectRequired).toBe(true);
    expect(result.details.userAction).toBe("reconnect_google_account");
  });

  it("classifies invalid_client as server OAuth configuration", () => {
    const result = classifyGoogleTokenEndpointFailure({
      context: "authorization_code",
      status: 401,
      googleError: "invalid_client",
      description: "The OAuth client was not found.",
    });

    expect(result.code).toBe("failed-precondition");
    expect(result.details.reason).toBe("server_oauth_configuration");
    expect(result.details.reconnectRequired).toBe(false);
    expect(result.details.adminAction).toContain("GOOGLE_OAUTH_CLIENT_ID");
  });

  it("classifies real token endpoint outages as retryable unavailable", () => {
    const result = classifyGoogleTokenEndpointFailure({
      context: "refresh_token",
      status: 503,
      googleError: "backend_error",
      description: "temporary",
    });

    expect(result.code).toBe("unavailable");
    expect(result.details.reason).toBe("token_endpoint_failed");
  });
});
