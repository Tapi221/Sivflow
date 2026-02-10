import { describe, expect, it } from "vitest";
import {
  isPlaceholderImplementationEnabled,
  isScopedStoragePath,
  validateConverterToken,
} from "../../functions/src/pptxConverterGuards";

describe("pptxConverterGuards", () => {
  it("accepts only scoped document paths", () => {
    expect(
      isScopedStoragePath("users/u1/documents/d1/pptx/manifest.json", "u1", "d1")
    ).toBe(true);
    expect(
      isScopedStoragePath("users/u1/documents/d2/pptx/manifest.json", "u1", "d1")
    ).toBe(false);
    expect(
      isScopedStoragePath("users/u2/documents/d1/pptx/manifest.json", "u1", "d1")
    ).toBe(false);
  });

  it("enforces converter token presence and match", () => {
    expect(validateConverterToken(undefined, "x")).toBe("misconfigured");
    expect(validateConverterToken("secret", undefined)).toBe("unauthorized");
    expect(validateConverterToken("secret", "wrong")).toBe("unauthorized");
    expect(validateConverterToken("secret", "secret")).toBe("ok");
  });

  it("disables placeholder unless explicitly enabled", () => {
    expect(
      isPlaceholderImplementationEnabled({
        PPTX_CONVERTER_IMPLEMENTATION: "real",
      } as NodeJS.ProcessEnv)
    ).toBe(false);

    expect(
      isPlaceholderImplementationEnabled({
        PPTX_CONVERTER_IMPLEMENTATION: "placeholder",
      } as NodeJS.ProcessEnv)
    ).toBe(true);

    expect(
      isPlaceholderImplementationEnabled({
        PPTX_CONVERTER_PLACEHOLDER_ENABLED: "1",
      } as NodeJS.ProcessEnv)
    ).toBe(true);

    expect(isPlaceholderImplementationEnabled({} as NodeJS.ProcessEnv)).toBe(false);
  });
});

