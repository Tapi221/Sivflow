import { describe, expect, it } from "vitest";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { clampNormalizedZoomPercent, resolvePresentationWidthPx, resolveZoomPercentForPresentationWidthPx } from "@/features/cardsetview/domain/cardSetViewPresentationPolicy";
import { computeNextCardSetViewZoomPercentFromGesture, computeNextCardSetViewZoomPercentFromWheel, shouldHandleCardSetViewZoomInputTarget } from "@/features/cardsetview/presentation/web/hooks/cardSetViewZoomInputUtils";

describe("cardSetViewZoomInputUtils", () => {
  describe("computeNextCardSetViewZoomPercentFromWheel", () => {
    it("細かなホイールズームではズームを 1% ずつ増減する", () => {
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

    it("大きなトラックパッド delta では大きいステップ数を適用する", () => {
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

    it("最小・最大境界へ clamp する", () => {
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

    it("Safari gesture scale を 1% 精度の presentation width semantics 経由で変換する", () => {
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

    it("no-op の gesture 変更では現在のズーム率を返す", () => {
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
    it("workspace 内の非インタラクティブ子孫を受け入れる", () => {
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

    it("zoom-input-ignore としてマークされた target を拒否する", () => {
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

    it("編集可能な子孫を拒否する", () => {
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

    it("workspace 外の target を拒否する", () => {
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
