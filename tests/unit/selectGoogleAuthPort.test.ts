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

    expect(selected).to