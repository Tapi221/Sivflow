import { describe, expect, it } from "vitest";

import {
  canGoToNextCardCarouselItem,
  canGoToPreviousCardCarouselItem,
  clampCardCarouselIndex,
  isNearCardCarouselItem,
  shouldNotifyCardCarouselIndexChange,
} from "@/features/review/domain/cardCarouselIndexRules";

describe("cardCarousel3D shared logic", () => {
  it("index を 0..count-1 に clamp する", () => {
    expect(clampCardCarouselIndex(-1, 0)).toBe(0);
    expect(clampCardCarouselIndex(1, 1)).toBe(0);
    expect(clampCardCarouselIndex(-1, 3)).toBe(0);
    expect(clampCardCarouselIndex(0, 3)).toBe(0);
    expect(clampCardCarouselIndex(2, 3)).toBe(2);
    expect(clampCardCarouselIndex(99, 3)).toBe(2);
    expect(clampCardCarouselIndex(1.2, 3)).toBe(1);
  });

  it("prev / next 移動可否を判定する", () => {
    expect(canGoToPreviousCardCarouselItem(0)).toBe(false);
    expect(canGoToNextCardCarouselItem(0, 0)).toBe(false);
    expect(canGoToNextCardCarouselItem(0, 1)).toBe(false);
    expect(canGoToPreviousCardCarouselItem(0)).toBe(false);
    expect(canGoToPreviousCardCarouselItem(1)).toBe(true);
    expect(canGoToNextCardCarouselItem(1, 3)).toBe(true);
    expect(canGoToNextCardCarouselItem(2, 3)).toBe(false);
  });

  it("near item 判定を行う", () => {
    expect(
      isNearCardCarouselItem({
        activeIndex: 3,
        targetIndex: 4,
        radius: 1,
      }),
    ).toBe(true);
    expect(
      isNearCardCarouselItem({
        activeIndex: 3,
        targetIndex: 2,
        radius: 1,
      }),
    ).toBe(true);
    expect(
      isNearCardCarouselItem({
        activeIndex: 3,
        targetIndex: 1,
        radius: 1,
      }),
    ).toBe(false);
  });

  it("通知要否のルールを返す", () => {
    expect(
      shouldNotifyCardCarouselIndexChange({
        previousIndex: 1,
        nextIndex: 2,
      }),
    ).toBe(true);
    expect(
      shouldNotifyCardCarouselIndexChange({
        previousIndex: 2,
        nextIndex: 2,
      }),
    ).toBe(false);
  });
});
