import { describe, expect, it, vi } from "vitest";

import { selectGoogleAuthPort } from "@/services/auth/googleSignIn";

describe("selectGoogleAuthPort", () => {
  it("selects desktopAuth when desktop runtime", () => {
    const webAuth = { signIn: vi.fn() };
    const desktopAuth = { signIn: vi.fn() };

    const selected = selectGoogleAuthPort({
      webAuth,
      desktopAuth,
      isDesktop: true,
      userAgent: "",
    });

    expect(selected).toBe(desktopAuth);
  });

  it("selects desktopAuth when Electron renderer user agent", () => {
    const webAuth = { signIn: vi.fn() };
    const desktopAuth = { signIn: vi.fn() };

    const selected = selectGoogleAuthPort({
      webAuth,
      desktopAuth,
      isDesktop: false,
      userAgent: "Mozilla/5.0 Electron/30.0.0",
    });

    expect(selected).toBe(desktopAuth);
  });

  it("selects webAuth otherwise", () => {
    const webAuth = { signIn: vi.fn() };
    const desktopAuth = { signIn: vi.fn() };

    const selected = selectGoogleAuthPort({
      webAuth,
      desktopAuth,
      isDesktop: false,
      userAgent: "Mozilla/5.0",
    });

    expect(selected).toBe(webAuth);
  });
});
