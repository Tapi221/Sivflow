import { describe, expect, it } from "vitest";

import {
  resolveCardScaleRenderingStrategy,
} from "@/components/card/frame/cardScaleRenderingStrategy";

describe("resolveCardScaleRenderingStrategy", () => {
  it("returns none when scaling is disabled", () => {
    const result = resolveCardScaleRenderingStrategy({
      disableScale: true,
      effectiveScale: 1.5,
      supportsCssZoom: true,
    });

    expect(result.mode).toBe("none");
    expect(result.zoom).toBeUndefined();
    expect(result.transform).toBe("none");
    expect(result.willChange).toBeUndefined();
  });

  it("prefers css zoom when supported so fixed card rendering stays sharp", () => {
    const result = resolveCardScaleRenderingStrategy({
      disableScale: false,
      effectiveScale: 1.35,
      supportsCssZoom: true,
    });

    expect(result.mode).toBe("zoom");
    expect(result.zoom).toBe(1.35);
    expect(result.transform).toBe("none");
    expect(result.willChange).toBeUndefined();
  });
});
