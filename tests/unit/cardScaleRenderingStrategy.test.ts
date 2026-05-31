import { describe, expect, it } from "vitest";
import { resolveCardScaleRenderingStrategy } from "@/components/card/frame/cardScaleRenderingStrategy";

describe("resolveCardScaleRenderingStrategy", () => {
  it("スケーリングが無効な場合は none を返す", () => {
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

  it("対応していれば css zoom を優先する", () => {
    const result = resolveCardScaleRenderingStrategy({
      disableScale: false,
      effectiveScale: 1.35,
      supportsCssZoom: true,
    });

    expect(result.mode).toBe("zoom");
    expect(result.zoom).toBe(1.35);
    expect(result.transform).toBe("none");
  });

  it("css zoom 非対応なら transform にフォールバックする", () => {
    const result = resolveCardScaleRenderingStrategy({
      disableScale: false,
      effectiveScale: 1.35,
      supportsCssZoom: false,
    });

    expect(result.mode).toBe("transform");
    expect(result.zoom).toBeUndefined();
    expect(result.transform).toBe("scale(1.35)");
    expect(result.willChange).toBe("transform");
  });
});
