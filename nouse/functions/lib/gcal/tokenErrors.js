const OAUTH_CLIENT_NOT_FOUND_PATTERNS = [
    "oauth client was not found",
    "client was not found",
    "oauth client not found",
];
const isGoogleOAuthServerConfigurationError = (googleError, description) => {
    const normalizedDescription = description.toLowerCase();
    return (googleError === "invalid_client" ||
        googleError === "unauthorized_client" ||
        OAUTH_CLIENT_NOT_FOUND_PATTERNS.some((pattern) => normalizedDescription.includes(pattern)));
};
const classifyGoogleTokenEndpointFailure = ({ context, status, googleError, description, }) => {
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
                adminAction: "check GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET and redeploy functions",
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
export { isGoogleOAuthServerConfigurationError, classifyGoogleTokenEndpointFailure };
