import { describe, expect, it, vi } from "vitest";
import { selectGoogleAuthPort } from "@/services/auth/googleSignIn";

const createAuthPort = () => ({ signIn: vi.fn() });

describe("selectGoogleAuthPort", () => {
  it("selects desktopAuth when desktop runtime", () => {
    const webAuth = createAuthPort();
    const desktopAuth = createAuthPort();

    const selected = selectGoogleAuthPort({
      webAuth,
      desktopAuth,
      runtimeKind: "desktop",
      userAgent: "",
    });

    expect(selected).toBe(desktopAuth);
  });

  it("selects webAuth otherwise", () => {
    const webAuth = createAuthPort();
    const desktopAuth = createAuthPort();

    const selected = selectGoogleAuthPort({
      webAuth,
      desktopAuth,
      runtimeKind: "web",
      userAgent: "Mozilla/5.0",
    });

    expect(selected).toBe(webAuth);
  });
});
