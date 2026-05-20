import { describe, expect, it } from "vitest";

import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import {
  clampNormalizedZoomPercent,
  resolvePresentationWidthPx,
  resolveZoomPercentForPresentationWidthPx,
} from "@/features/cardsetview/domain/cardSetViewPresentationPolicy";
import {
  computeNextCardSetViewZoomPercentFromGesture,
  computeNextCardSetViewZoomPercentFromWheel,
  shouldHandleCardSetViewZoomInputTarget,
} from "@/features/cardsetview/presentation/web/hooks/cardSetViewZoomInputUtils";

describe("cardSetViewZoomInputUtils", () => {
  describe("computeNextCardSetViewZoomPercentFromWheel", () => {
    it("increments and decrements zoom by 1 percent for fine-grained wheel zoom", () => {
      expect(
        computeNextCardSetViewZoomPercentFromWheel({
          currentZoomPercent: 45,
          deltaY: -10,
          minZoomPercent: 0,
          maxZoomPercent: 100,
          stepPercent: 1,
        }),
      ).toBe(46);

      expect(
        computeNextCardSetViewZoomPercentFromWheel({
          currentZoomPercent: 45,
          deltaY: 10,
          minZoomPercent: 0,
          maxZoomPercent: 100,
          stepPercent: 1,
        }),
      ).toBe(44);
    });

    it("applies larger step counts for larger trackpad deltas", () => {
      expect(
        computeNextCardSetViewZoomPercentFromWheel({
          currentZoomPercent: 45,
          deltaY: -170,
          minZoomPercent: 0,
          maxZoomPercent: 100,
          stepPercent: 1,
        }),
      ).toBe(47);
    });

    it("clamps to min and max bounds", () => {
      expect(
        computeNextCardSetViewZoomPercentFromWheel({
          currentZoomPercent: 0,
          deltaY: 120,
          minZoomPercent: 0,
          maxZoomPercent: 100,
          stepPercent: 1,
        }),
      ).toBe(0);

      expect(
        computeNextCardSetViewZoomPercentFromWheel({
          currentZoomPercent: 100,
          deltaY: -120,
          minZoomPercent: 0,
          maxZoomPercent: 100,
          stepPercent: 1,
        }),
      ).toBe(100);
    });
  });

  describe("computeNextCardSetViewZoomPercentFromGesture", () => {
    const cardLayoutMode: CardLayoutMode = "flip";
    const maxPresentationWidthPx = 1200;

    it("maps Safari gesture scale through presentation width semantics with 1 percent precision", () => {
      const currentZoomPercent = 45;
      const basePresentationWidthPx = resolvePresentationWidthPx({
        zoomPercent: currentZoomPercent,
        cardLayoutMode,
        maxPresentationWidthPx,
      });

      const expectedPercent = clampNormalizedZoomPercent(
        resolveZoomPercentForPresentationWidthPx({
          targetPresentationWidthPx: basePresentationWidthPx * 1.25,
          cardLayoutMode,
          maxPresentationWidthPx,
        }),
        1,
      );

      expect(
        computeNextCardSetViewZoomPercentFromGesture({
          currentZoomPercent,
          basePresentationWidthPx,
          gestureScale: 1.25,
          cardLayoutMode,
          maxPresentationWidthPx,
          minZoomPercent: 0,
          maxZoomPercent: 100,
          stepPercent: 1,
        }),
      ).toBe(expectedPercent);
    });

    it("returns the current zoom percent for no-op gesture changes", () => {
      expect(
        computeNextCardSetViewZoomPercentFromGesture({
          currentZoomPercent: 45,
          basePresentationWidthPx: 900,
          gestureScale: 1,
          cardLayoutMode,
          maxPresentationWidthPx,
          minZoomPercent: 0,
          maxZoomPercent: 100,
          stepPercent: 1,
        }),
      ).toBe(45);
    });
  });

  describe("shouldHandleCardSetViewZoomInputTarget", () => {
    it("accepts non-interactive descendants inside the workspace", () => {
      const container = document.createElement("div");
      const cardBody = document.createElement("div");
      container.appendChild(cardBody);

      expect(
        shouldHandleCardSetViewZoomInputTarget({
          container,
          target: cardBody,
        }),
      ).toBe(true);
    });

    it("rejects targets marked as zoom-input-ignore", () => {
      const container = document.createElement("div");
      const ignoredRoot = document.createElement("div");
      const sliderThumb = document.createElement("span");

      ignoredRoot.setAttribute("data-card-zoom-input-ignore", "true");
      ignoredRoot.appendChild(sliderThumb);
      container.appendChild(ignoredRoot);

      expect(
        shouldHandleCardSetViewZoomInputTarget({
          container,
          target: sliderThumb,
        }),
      ).toBe(false);
    });

    it("rejects editable descendants", () => {
      const container = document.createElement("div");
      const editor = document.createElement("div");
      editor.setAttribute("contenteditable", "true");
      container.appendChild(editor);

      expect(
        shouldHandleCardSetViewZoomInputTarget({
          container,
          target: editor,
        }),
      ).toBe(false);
    });

    it("rejects targets outside the workspace", () => {
      const container = document.createElement("div");
      const outside = document.createElement("div");

      expect(
        shouldHandleCardSetViewZoomInputTarget({
          container,
          target: outside,
        }),
      ).toBe(false);
    });
  });
});
