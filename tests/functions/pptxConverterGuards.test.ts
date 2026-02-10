import { describe, expect, it, vi } from "vitest";
import {
  CONVERTER_IMPLEMENTATION_ENV,
  CONVERTER_PLACEHOLDER_ENABLED_ENV,
  LEGACY_CONVERTER_ENDPOINT_ENV,
  PRIMARY_CONVERTER_ENDPOINT_ENV,
  asNonEmptyString,
  isPlaceholderImplementationEnabled,
  isScopedStoragePath,
  resolveConverterEndpointFromEnv,
  validateConverterToken,
} from "../../functions/src/pptxConverterGuards";

describe("pptxConverterGuards", () => {
  it("validates scoped storage path", () => {
    expect(
      isScopedStoragePath(
        "users/u1/documents/d1/source.pptx",
        "u1",
        "d1"
      )
    ).toBe(true);
    expect(
      isScopedStoragePath(
        "users/u2/documents/d1/source.pptx",
        "u1",
        "d1"
      )
    ).toBe(false);
  });

  it("validates converter token", () => {
    expect(validateConverterToken("token", "token")).toBe("ok");
    expect(validateConverterToken("token", "wrong")).toBe("unauthorized");
    expect(validateConverterToken("", "token")).toBe("misconfigured");
  });

  it("resolves placeholder mode from env", () => {
    expect(
      isPlaceholderImplementationEnabled({
        [CONVERTER_IMPLEMENTATION_ENV]: "placeholder",
      } as NodeJS.ProcessEnv)
    ).toBe(true);

    expect(
      isPlaceholderImplementationEnabled({
        [CONVERTER_IMPLEMENTATION_ENV]: "real",
      } as NodeJS.ProcessEnv)
    ).toBe(false);

    expect(
      isPlaceholderImplementationEnabled({
        [CONVERTER_PLACEHOLDER_ENABLED_ENV]: "1",
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it("prefers primary endpoint and warns on split config", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const endpoint = resolveConverterEndpointFromEnv({
      [PRIMARY_CONVERTER_ENDPOINT_ENV]: "https://primary.example/convert",
      [LEGACY_CONVERTER_ENDPOINT_ENV]: "https://legacy.example/convert",
    } as NodeJS.ProcessEnv);

    expect(endpoint).toBe("https://primary.example/convert");
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("normalizes empty strings", () => {
    expect(asNonEmptyString(" x ")).toBe("x");
    expect(asNonEmptyString("   ")).toBeNull();
    expect(asNonEmptyString(null)).toBeNull();
  });
});
