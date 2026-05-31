import { describe, expect, it } from "vitest";
import { resolveWheelZoomStepCount } from "@/shared/zoom/wheelZoomMath";

describe("resolveWheelZoomStepCount", () => {
  it("少なくとも 1 ステップを返す", () => {
    expect(resolveWheelZoomStepCount({ deltaY: 1 })).toBe(1);
  });

  it("delta の大きさに応じてステップ数をスケールする", () => {
    expect(resolveWheelZoomStepCount({ deltaY: 80 })).toBe(1);
    expect(resolveWheelZoomStepCount({ deltaY: 160 })).toBe(2);
    expect(resolveWheelZoomStepCount({ deltaY: -240 })).toBe(3);
  });

  it("無効な場合はデフォルトの deltaPerStep にフォールバックする", () => {
    expect(
      resolveWheelZoomStepCount({
        deltaY: 160,
        deltaPerStep: 0,
      }),
    ).toBe(2);
  });
});
