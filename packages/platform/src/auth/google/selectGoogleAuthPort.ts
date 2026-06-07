import { describe, expect, it, vi } from "vitest";
import { selectGoogleAuthPort } from "@/services/auth/googleSignIn";

const createAuthPort = () => ({ signIn: vi.fn() });

describe("Google 認証ポート選択", () => {
  it("デスクトップ実行時は desktopAuth を選択する", () => {
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

  it("Tauri の userAgent がある場合は desktopAuth を選択する", () => {
    const webAuth = createAuthPort();
    const desktopAuth = createAuthPort();

    const selected = selectGoogleAuthPort({
      webAuth,
      desktopAuth,
      runtimeKind: "web",
      userAgent: "Mozilla/5.0 Tauri",
    });

    expect(selected).toBe(desktopAuth);
  });

  it("Web 実行時は webAuth を選択する", () => {
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