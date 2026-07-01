import {
  clearPendingFirebaseRedirectSignIn,
  getPendingFirebaseRedirectSignInTarget,
  hasPendingFirebaseRedirectSignIn,
  markPendingFirebaseRedirectSignIn,
} from "@affine/core/modules/cloud/utils/firebase-auth";
import { afterEach, describe, expect, test } from "vitest";

describe("firebase redirect sign-in flag", () => {
  afterEach(() => {
    clearPendingFirebaseRedirectSignIn();
  });

  test("tracks pending redirect sign-in in session storage", () => {
    expect(hasPendingFirebaseRedirectSignIn()).toBe(false);
    expect(getPendingFirebaseRedirectSignInTarget()).toBeNull();

    markPendingFirebaseRedirectSignIn("/?initCloud=true");

    expect(hasPendingFirebaseRedirectSignIn()).toBe(true);
    expect(getPendingFirebaseRedirectSignInTarget()).toBe("/?initCloud=true");
    expect(window.sessionStorage.getItem("sivflow.firebase.redirectSignIn")).toBe(
      "true"
    );
    expect(window.localStorage.getItem("sivflow.firebase.redirectSignIn")).toBe(
      "true"
    );

    clearPendingFirebaseRedirectSignIn();

    expect(hasPendingFirebaseRedirectSignIn()).toBe(false);
    expect(getPendingFirebaseRedirectSignInTarget()).toBeNull();
  });
});
