import { describe, expect, it } from "vitest";
import { buildRuledTextareaStyle } from "@/components/card/blocks/core/ruledTextareaStyle";

describe("buildRuledTextareaStyle", () => {
  it("builds textarea ruled lines from the shared ruled style generator", () => {
    const style = buildRuledTextareaStyle({ rowPx: 24 });

    expect(style.backgroundImage).toContain("data:image/svg+xml");
    expect(style.backgroundSize).toBe("100% 24px");
    expect(style.backgroundPosition).toBe("0 0px");
    expect(style.backgroundRepeat).toBe("repeat-y");
    expect(style.backgroundAttachment).toBe("local");
  });

  it("supports zoom-scaled row sizes and line offsets", () => {
    const style = buildRuledTextareaStyle({ rowPx: 30, offsetPx: 8 });

    expect(style.backgroundSize).toBe("100% 30px");
    expect(style.backgroundPosition).toBe("0 8px");
  });
});