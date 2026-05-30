// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

const createDesktopBridgeStub = () => ({
  app: {
    getVersion: vi.fn(() => "desktop-version"),
  },
  shell: {
    openExternal: vi.fn(async () => {}),
  },
  files: {
    readImportFile: vi.fn(async () => ({ path: "", name: "", size: 0, data: [] })),
    selectImportFiles: vi.fn(async () => []),
    onImportFileOpen: vi.fn(() => () => {}),
  },
  oauth: {
    start: vi.fn(() => "started"),
    cancel: vi.fn(() => {}),
    takePendingCallback: vi.fn(async () => null),
    exchangeIdToken: vi.fn(async () => "id-token"),
    storeRefreshToken: vi.fn(async () => {}),
    readRefreshToken: vi.fn(async () => null),
    deleteRefreshToken: vi.fn(async () => {}),
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
    delete win.desktop;

    vi.resetModules();
    const { default: platform } = await import("@/platform");

    await expect(platform.oauth.start("https://example.com")).rejects.toThrow(
      /bridge is not available/i,
    );
  });

  it("uses desktop platform when desktop bridge is available", async () => {
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
  });
});
