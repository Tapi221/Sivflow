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

  it("separates persisted zoom by interaction mode", () => {
    const viewportRef = createViewportRef(1400);

    const { result, rerender } = renderHook(
      ({
        interactionMode,
      }: {
        interactionMode: "view" | "edit";
      }) =>
        useCardSetViewZoom({
          deviceScope: "desktop",
          cardSetId: "card-set-1",
          viewportRef,
          activeCardKey: `card-1:fixed:flip:${interactionMode}`,
          displayMode: "fixed",
          interactionMode,
          requestedCardLayoutMode: "flip",
          splitFallbackLayoutMode: "flip",
        }),
      {
        initialProps: {
          interactionMode: "view" as const,
        },
      },
    );

    expect(result.current.defaultZoomPercent).toBe(62);

    act(() => {
      result.current.setZoomPercent(75);
    });

    expect(result.current.zoomPercent).toBe(75);

    rerender({
      interactionMode: "edit",
    });

    expect(result.current.defaultZoomPercent).toBe(52);
    expect(result.current.zoomPercent).toBe(52);

    act(() => {
      result.current.setZoomPercent(35);
    });

    expect(result.current.zoomPercent).toBe(35);

    rerender({
      interactionMode: "view",
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
});
