import { describe, expect, it } from "vitest";

import { resolveWheelZoomStepCount } from "@/shared/zoom/wheelZoomMath";

describe("resolveWheelZoomStepCount", () => {
  it("returns at least one step", () => {
    expect(resolveWheelZoomStepCount({ deltaY: 1 })).toBe(1);
  });

  it("scales steps by delta magnitude", () => {
    expect(resolveWheelZoomStepCount({ deltaY: 80 })).toBe(1);
    expect(resolveWheelZoomStepCount({ deltaY: 160 })).toBe(2);
    expect(resolveWheelZoomStepCount({ deltaY: -240 })).toBe(3);
  });

  it("falls back to the default deltaPerStep when invalid", () => {
    expect(
      resolveWheelZoomStepCount({
        deltaY: 160,
        deltaPerStep: 0,
      }),
    ).toBe(2);
  });
});
