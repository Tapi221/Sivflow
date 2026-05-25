import type { FunctionsErrorCode } from "firebase-functions/v2/https";

export type GoogleOAuthTokenErrorReason =
  | "invalid_grant"
  | "server_oauth_configuration"
  | "token_endpoint_failed";

export type ClassifiedGoogleTokenEndpointFailure = {
  code: FunctionsErrorCode;
  message: string;
  details: {
    reason: GoogleOAuthTokenErrorReason;
    reconnectRequired: boolean;
    userAction?: "reconnect_google_account";
    adminAction?: string;
    googleError: string;
    status: number;
  };
};

const OAUTH_CLIENT_NOT_FOUND_PATTERNS = [
  "oauth client was not found",
  "client was not found",
  "oauth client not found",
];

export const isGoogleOAuthServerConfigurationError = (googleError: string, description: string): boolean => {
  const normalizedDescription = description.toLowerCase();

  return (
    googleError === "invalid_client" ||
    googleError === "unauthorized_client" ||
    OAUTH_CLIENT_NOT_FOUND_PATTERNS.some((pattern) => normalizedDescription.includes(pattern))
  );
};

export const classifyGoogleTokenEndpointFailure = ({
  context,
  status,
  googleError,
  description,
}: {
  context: "authorization_code" | "refresh_token";
  status: number;
  googleError: string;
  description: string;
}): ClassifiedGoogleTokenEndpointFailure => {
  if (googleError === "invalid_grant") {
    return {
      code: "failed-precondition",
      message: `Google OAuth ${context} is invalid or expired. Reconnect the Google account.`,
      details: {
        reason: "invalid_grant",
        reconnectRequired: true,
        userAction: "reconnect_google_account",
        googleError,
        status,
      },
    };
  }

  if (isGoogleOAuthServerConfigurationError(googleError, description)) {
    return {
      code: "failed-precondition",
      message: "Google OAuth server configuration is invalid.",
      details: {
        reason: "server_oauth_configuration",
        reconnectRequired: false,
        adminAction: "check GOOGLE_OAUTH_WEB_CLIENT_ID / GOOGLE_OAUTH_WEB_CLIENT_SECRET and redeploy functions",
        googleError,
        status,
      },
    };
  }

  if (status === 429) {
    return {
      code: "resource-exhausted",
      message: `Google OAuth token endpoint is rate limited (${context}).`,
      details: {
        reason: "token_endpoint_failed",
        reconnectRequired: false,
        googleError,
        status,
      },
    };
  }

  if (status >= 500) {
    return {
      code: "unavailable",
      message: `Google OAuth token endpoint is temporarily unavailable (${context}).`,
      details: {
        reason: "token_endpoint_failed",
        reconnectRequired: false,
        googleError,
        status,
      },
    };
  }

  return {
    code: "failed-precondition",
    message: `Google OAuth token endpoint rejected the ${context} request.`,
    details: {
      reason: "token_endpoint_failed",
      reconnectRequired: false,
      googleError,
      status,
    },
  };
};
