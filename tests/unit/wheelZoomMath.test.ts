import { describe, expect, it } from "vitest";
import { resolveWheelZoomStepCount } from "@/utils/zoom/wheelZoomMath";

describe("resolveWheelZoomStepCount", () => {
  it("少なくとも 1 ステップを返す", () => {
    expect(resolveWheelZoomStepCount({ deltaY: 1 })).toBe(1);
  });

  it("Sioyek と同じ 120 delta を 1 ステップとして扱う", () => {
    expect(resolveWheelZoomStepCount({ deltaY: 120 })).toBe(1);
    expect(resolveWheelZoomStepCount({ deltaY: 240 })).toBe(2);
    expect(resolveWheelZoomStepCount({ deltaY: -360 })).toBe(3);
  });

  it("無効な場合はデフォルトの deltaPerStep にフォールバックする", () => {
    expect(
      resolveWheelZoomStepCount({
        deltaY: 240,
        deltaPerStep: 0,
      }),
    ).toBe(2);
  });
});
