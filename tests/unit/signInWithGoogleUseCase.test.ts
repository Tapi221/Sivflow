// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSignInWithGoogleUseCase } from "@/application/auth/SignInWithGoogle";

const defineNavigatorUserAgent = (userAgent: string) => {
  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });
};

describe("createSignInWithGoogleUseCase", () => {
  beforeEach(() => {
    const win = window as Window & { desktop?: unknown };
    defineNavigatorUserAgent("Mozilla/5.0");
    delete win.desktop;
  });

  it("uses desktopAuth when desktop runtime is detected", async () => {
    const win = window as Window & { desktop?: unknown };
    defineNavigatorUserAgent("Electron/30.0.0 (FlashCard-Master)");
    Object.defineProperty(win, "desktop", { value: {}, configurable: true });

    const webAuth = { signIn: vi.fn(async () => {}) };
    const desktopAuth = { signIn: vi.fn(async () => {}) };

    const useCase = createSignInWithGoogleUseCase({ webAuth, desktopAuth });
    await useCase.execute();

    expect(desktopAuth.signIn).toHaveBeenCalledTimes(1);
    expect(webAuth.signIn).not.toHaveBeenCalled();
  });

  it("uses desktopAuth when Electron renderer is detected (even without bridge)", async () => {
    defineNavigatorUserAgent("Electron/30.0.0 (FlashCard-Master)");

    const webAuth = { signIn: vi.fn(async () => {}) };
    const desktopAuth = { signIn: vi.fn(async () => {}) };

    const useCase = createSignInWithGoogleUseCase({ webAuth, desktopAuth });
    await useCase.execute();

    expect(desktopAuth.signIn).toHaveBeenCalledTimes(1);
    expect(webAuth.signIn).not.toHaveBeenCalled();
  });

  it("uses webAuth in a normal web runtime", async () => {
    defineNavigatorUserAgent("Mozilla/5.0");

    const webAuth = { signIn: vi.fn(async () => {}) };
    const desktopAuth = { signIn: vi.fn(async () => {}) };

    const useCase = createSignInWithGoogleUseCase({ webAuth, desktopAuth });
    await useCase.execute();

    expect(webAuth.signIn).toHaveBeenCalledTimes(1);
    expect(desktopAuth.signIn).not.toHaveBeenCalled();
  });
});
