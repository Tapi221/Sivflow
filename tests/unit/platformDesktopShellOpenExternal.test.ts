// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const bridgeShellOpenExternalMock = vi.fn(async () => {});

vi.mock("@/platform/desktop/bridge", () => ({
  getDesktopBridge: () => ({
    shell: {
      openExternal: bridgeShellOpenExternalMock,
    },
  }),
}));

describe("platform/desktop.shell.openExternal", () => {
  beforeEach(() => {
    bridgeShellOpenExternalMock.mockClear();
  });

  it("http(s)/mailto は desktop bridge に委譲する", async () => {
    const { desktopPlatform } = await import("@/platform/desktop");

    await desktopPlatform.shell.openExternal("https://example.com");
    expect(bridgeShellOpenExternalMock).toHaveBeenCalledWith(
      "https://example.com",
    );
  });

  it("http(s)/mailto 以外の URL では window.open にフォールバックする", async () => {
    const windowOpenMock = vi.fn();
    Object.defineProperty(window, "open", {
      value: windowOpenMock,
      configurable: true,
    });

    const { desktopPlatform } = await import("@/platform/desktop");

    await desktopPlatform.shell.openExternal("file:///tmp/example.pdf");
    expect(bridgeShellOpenExternalMock).not.toHaveBeenCalled();
    expect(windowOpenMock).toHaveBeenCalledWith(
      "file:///tmp/example.pdf",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
