import { describe, expect, it } from "vitest";
import { selectGoogleAuthPort } from "@platform/auth/google/selectGoogleAuthPort";

const webAuth = { signIn: async () => undefined };
const desktopAuth = { signIn: async () => undefined };

describe("selectGoogleAuthPort", () => {
  it("selects desktop auth for desktop runtime", () => {
    expect(selectGoogleAuthPort({ webAuth, desktopAuth, runtimeKind: "desktop