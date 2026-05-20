// @vitest-environment jsdom
import { render } from "@testing-library/react";
import React from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const scrollToMock = vi.fn();

class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

let VerticalCardPager: typeof import("@/features/review/VerticalCardPager").VerticalCardPager;

beforeAll(async () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      media: "(min-width: 768px)",
      onchange: null,
    })),
  });

  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: ResizeObserverMock,
  });

  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: scrollToMock,
  });

  ({ VerticalCardPager } = await import("@/features/review/VerticalCardPager"));
});

beforeEach(() => {
  scrollToMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("VerticalCardPager", () => {
  it("request key が変わった時だけ active card へ scroll する", () => {
    const cards = ["a", "b", "c"];
    const onActiveIndexChange = vi.fn();

    const view = render(
      <VerticalCardPager
        cards={cards}
        activeIndex={0}
        onActiveIndexChange={onActiveIndexChange}
        renderCard={(card) => <div>{card}</div>}
        getKey={(card) => card}
        scrollToActiveIndexRequestKey={0}
      />,
    );

    expect(scrollToMock).not.toHaveBeenCalled();

    view.rerender(
      <VerticalCardPager
        cards={cards}
        activeIndex={2}
        onActiveIndexChange={onActiveIndexChange}
        renderCard={(card) => <div>{card}</div>}
        getKey={(card) => card}
        scrollToActiveIndexRequestKey={0}
      />,
    );

    expect(scrollToMock).not.toHaveBeenCalled();

    view.rerender(
      <VerticalCardPager
        cards={cards}
        activeIndex={2}
        onActiveIndexChange={onActiveIndexChange}
        renderCard={(card) => <div>{card}</div>}
        getKey={(card) => card}
        scrollToActiveIndexRequestKey={1}
      />,
    );

    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        behavior: "auto",
      }),
    );
  });

  it("明示ジャンプ時に custom scroll behavior を使う", () => {
    const cards = ["a", "b", "c"];

    const view = render(
      <VerticalCardPager
        cards={cards}
        activeIndex={0}
        onActiveIndexChange={vi.fn()}
        renderCard={(card) => <div>{card}</div>}
        getKey={(card) => card}
        scrollToActiveIndexRequestKey={0}
        scrollToActiveIndexBehavior="smooth"
      />,
    );

    view.rerender(
      <VerticalCardPager
        cards={cards}
        activeIndex={1}
        onActiveIndexChange={vi.fn()}
        renderCard={(card) => <div>{card}</div>}
        getKey={(card) => card}
        scrollToActiveIndexRequestKey={2}
        scrollToActiveIndexBehavior="smooth"
      />,
    );

    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        behavior: "smooth",
      }),
    );
  });

  it("StrictMode の mount / unmount で ReferenceError を出さない", () => {
    const cards = ["a", "b"];

    expect(() => {
      const view = render(
        <React.StrictMode>
          <VerticalCardPager
            cards={cards}
            activeIndex={0}
            onActiveIndexChange={vi.fn()}
            renderCard={(card) => <div>{card}</div>}
            getKey={(card) => card}
          />
        </React.StrictMode>,
      );

      view.unmount();
    }).not.toThrow();
  });
});
