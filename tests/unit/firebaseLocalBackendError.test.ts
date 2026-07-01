import {
  createLocalDevFirebaseBackendUnavailableError,
  isLocalDevFirebaseBackendUnavailable,
  isLocalDevFirebaseBackendUnavailableError,
  LOCAL_DEV_FIREBASE_BACKEND_UNAVAILABLE_MESSAGE,
} from "../../packages/frontend/core/src/modules/cloud/utils/firebase-backend-error";
import { describe, expect, test } from "vitest";

describe("firebase backend error helpers", () => {
  test("detects local development proxy failures", () => {
    expect(
      isLocalDevFirebaseBackendUnavailable({
        backendEnabled: true,
        hostname: "127.0.0.1",
        responseText: "",
        status: 500,
      }),
    ).toBe(true);

    expect(
      isLocalDevFirebaseBackendUnavailable({
        backendEnabled: true,
        hostname: "localhost",
        status: 503,
      }),
    ).toBe(true);
  });

  test("ignores non-local or explained server errors", () => {
    expect(
      isLocalDevFirebaseBackendUnavailable({
        backendEnabled: true,
        hostname: "app.sivflow.com",
        responseText: "",
        status: 500,
      }),
    ).toBe(false);

    expect(
      isLocalDevFirebaseBackendUnavailable({
        backendEnabled: true,
        hostname: "127.0.0.1",
        responseText: "internal error",
        status: 500,
      }),
    ).toBe(false);
  });

  test("detects network errors and the dedicated user-facing error", () => {
    expect(
      isLocalDevFirebaseBackendUnavailable({
        backendEnabled: true,
        error: new TypeError("Failed to fetch"),
        hostname: "127.0.0.1",
      }),
    ).toBe(true);

    const error = createLocalDevFirebaseBackendUnavailableError();

    expect(error.message).toBe(
      LOCAL_DEV_FIREBASE_BACKEND_UNAVAILABLE_MESSAGE,
    );
    expect(isLocalDevFirebaseBackendUnavailableError(error)).toBe(true);
  });
});
