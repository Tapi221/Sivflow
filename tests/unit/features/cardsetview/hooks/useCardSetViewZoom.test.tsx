// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import type { RefObject } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { useCardSetViewZoom } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewZoom";

const createViewportRef = (width: number): RefObject<HTMLDivElement> => {
  const element = document.createElement("div");
  Object.defineProperty(element, "clientWidth", {
    configurable: true,
    value: width,
  });

  return {
    current: element,
  } as RefObject<HTMLDivElement>;
};

describe("useCardSetViewZoom", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shares persisted zoom across display mode, interaction mode, and layout mode", () => {
    const viewportRef = createViewportRef(1400);

    const { result, rerender } = renderHook(
      ({
        displayMode,
        interactionMode,
        requestedCardLayoutMode,
      }: {
        displayMode: "fixed" | "fluid";
        interactionMode: "view" | "edit";
        requestedCardLayoutMode: "flip" | "stack" | "split";
      }) =>
        useCardSetViewZoom({
          deviceScope: "desktop",
          cardSetId: "card-set-1",
          viewportRef,
          activeCardKey: `card-1:${displayMode}:${requestedCardLayoutMode}:${interactionMode}`,
          displayMode,
          interactionMode,
          requestedCardLayoutMode,
          splitFallbackLayoutMode: "flip",
        }),
      {
        initialProps: {
          displayMode: "fixed" as const,
          interactionMode: "view" as const,
          requestedCardLayoutMode: "flip" as const,
        },
      },
    );

    expect(result.current.defaultZoomPercent).toBeCloseTo(12, 5);
    expect(result.current.zoomScale).toBe(1);
    expect(result.current.fixedCardWidthPx).toBe(480);

    act(() => {
      result.current.setZoomPercent(75);
    });

    expect(result.current.zoomPercent).toBe(75);

    rerender({
      displayMode: "fixed",
      interactionMode: "edit",
      requestedCardLayoutMode: "stack",
    });

    expect(result.current.zoomPercent).toBe(75);
    expect(result.current.effectiveCardLayoutMode).toBe("stack");

    rerender({
      displayMode: "fluid",
      interactionMode: "view",
      requestedCardLayoutMode: "split",
    });

    expect(result.current.canUseSplit).toBe(true);
    expect(result.current.effectiveCardLayoutMode).toBe("split");
    expect(result.current.zoomPercent).toBe(75);

    rerender({
      displayMode: "fixed",
      interactionMode: "view",
      requestedCardLayoutMode: "flip",
    });

    expect(result.current.zoomPercent).toBe(75);
  });

  it("evaluates split availability independently from the requested layout mode", () => {
    const viewportRef = createViewportRef(820);

    const { result } = renderHook(() =>
      useCardSetViewZoom({
        deviceScope: "desktop",
        cardSetId: "card-set-2",
        viewportRef,
        activeCardKey: "card-1:fixed:flip:view",
        displayMode: "fixed",
        interactionMode: "view",
        requestedCardLayoutMode: "flip",
        splitFallbackLayoutMode: "flip",
      }),
    );

    expect(result.current.canUseSplit).toBe(false);
    expect(result.current.effectiveCardLayoutMode).toBe("flip");
  });

  it("recomputes the viewport-derived default until the user changes it", () => {
    const viewportRef = createViewportRef(1400);

    const { result } = renderHook(() =>
      useCardSetViewZoom({
        deviceScope: "desktop",
        cardSetId: "card-set-3",
        viewportRef,
        activeCardKey: "card-1:fixed:flip:view",
        displayMode: "fixed",
        interactionMode: "view",
        requestedCardLayoutMode: "flip",
        splitFallbackLayoutMode: "flip",
      }),
    );

    expect(result.current.defaultZoomPercent).toBeCloseTo(12, 5);
    expect(result.current.fixedCardWidthPx).toBe(480);

    act(() => {
      Object.defineProperty(viewportRef.current, "clientWidth", {
        configurable: true,
        value: 1000,
      });
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.defaultZoomPercent).toBeCloseTo(20, 5);
    expect(result.current.zoomPercent).toBeCloseTo(20, 5);
    expect(result.current.zoomScale).toBe(1);
    expect(result.current.fixedCardWidthPx).toBe(480);
  });
});
