// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

const defineNavigatorUserAgent = (userAgent: string) => {
  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });
};

const createDesktopBridgeStub = () => ({
  app: {
    getVersion: vi.fn(() => "desktop-version"),
  },
  shell: {
    openExternal: vi.fn(async () => {}),
  },
  oauth: {
    start: vi.fn(() => "started"),
    cancel: vi.fn(() => {}),
    exchangeIdToken: vi.fn(async () => ({ idToken: "id-token" })),
    onCallback: vi.fn(() => () => {}),
  },
  window: {
    minimize: vi.fn(() => {}),
    maximizeToggle: vi.fn(() => {}),
    close: vi.fn(() => {}),
    isMaximized: vi.fn(async () => false),
    onMaximizedStateChange: vi.fn(() => () => {}),
  },
});

describe("platform/index", () => {
  it("uses web platform when desktop bridge is not available", async () => {
    const win = window as Window & { desktop?: unknown };
    defineNavigatorUserAgent("Mozilla/5.0");
    delete win.desktop;

    vi.resetModules();
    const { default: platform } = await import("@/platform");

    await expect(platform.oauth.start("https://example.com")).rejects.toThrow(
      /bridge is not available/i,
    );
  });

  it(
    "uses desktop platform when desktop bridge is available even without Electron in userAgent",
    async () => {
      defineNavigatorUserAgent("Mozilla/5.0");

      const bridge = createDesktopBridgeStub();
      Object.defineProperty(window, "desktop", {
        value: bridge,
        configurable: true,
      });

      vi.resetModules();
      const { default: platform } = await import("@/platform");

      const result = platform.oauth.start("https://example.com");
      expect(result).toBe("started");
      expect(bridge.oauth.start).toHaveBeenCalledWith("https://example.com");
    },
  );
});
