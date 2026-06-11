// @vitest-environment jsdom
import React from "react";


import { flushSync } from "react-dom";


import { createRoot } from "react-dom/client";


import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";


import type { Card } from "@/types";


import { CardCarousel } from "@/features/study/CardCarousel";

const scrollToMock = vi.fn(function scrollTo(
  this: HTMLDivElement,
  options: ScrollToOptions,
) {
  this.scrollLeft = options.left ?? this.scrollLeft;
  this.dispatchEvent(new Event("scroll", { bubbles: true }));
});

function makeCard(id: string): Card {
  return { id } as unknown as Card;
}

function setup(element: React.ReactElement): HTMLDivElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  flushSync(() => {
    root.render(element);
  });
  return container;
}

function rerender(element: React.ReactElement) {
  flushSync(() => {
    root.render(element);
  });
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

vi.mock("framer-motion", () => ({
  motion: {
    div: React.forwardRef(function MotionDiv(
      props: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
      ref: React.Ref<HTMLDivElement>,
    ) {
      const rest = { ...props } as Record<string, unknown>;
      delete rest.animate;
      delete rest.transition;
      delete rest.drag;
      delete rest.dragConstraints;
      delete rest.dragElastic;
      delete rest.onDragEnd;
      return <div ref={ref} {...rest} />;
    }),
  },
}));

vi.mock("@/components/card/frame/Flashcard", () => ({
  Flashcard: ({ card }: { card?: { id?: string } | null }) => (
    <div data-testid="flashcard" data-card-id={card?.id ?? ""} />
  ),
}));

vi.mock("@/components/card/frame/MobileScalableCard", () => ({
  MobileScalableCard: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/study/StudyCard", () => ({
  default: ({ card }: { card?: { id?: string } | null }) => (
    <div data-testid="study-card" data-card-id={card?.id ?? ""} />
  ),
}));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  flushSync(() => {
    root.unmount();
  });
  container.remove();
  vi.clearAllMocks();
  vi.useRealTimers();
});

Object.defineProperty(HTMLElement.prototype, "scrollTo", {
  configurable: true,
  value: scrollToMock,
});

Object.defineProperty(window, "ResizeObserver", {
  configurable: true,
  value: ResizeObserverMock,
});

describe("CardCarousel", () => {
  it("中央カードが sessionCurrentIndex のカードを表示する", () => {
    const cards = [makeCard("a"), makeCard("b"), makeCard("c")];
    const el = setup(
      <CardCarousel cards={cards} sessionCurrentIndex={1} onResult={vi.fn()} />,
    );
    const center = el.querySelector(
      "[data-testid=\"study-card\"]",
    ) as HTMLElement;
    expect(center.dataset.cardId).toBe("b");
  });

  it("左右プレビューパネルに aria-hidden=\"true\" が設定されている", () => {
    const cards = [makeCard("a"), makeCard("b"), makeCard("c")];
    const el = setup(
      <CardCarousel cards={cards} sessionCurrentIndex={1} onResult={vi.fn()} />,
    );
    const panels = Array.from(el.querySelectorAll("[aria-hidden=\"true\"]"));
    expect(panels.length).toBeGreaterThan(0);
  });

  it("sessionCurrentIndex が変わるとスクロール位置を更新する", () => {
    const cards = [makeCard("a"), makeCard("b"), makeCard("c")];
    setup(<CardCarousel cards={cards} sessionCurrentIndex={0} onResult={vi.fn()} />);
    rerender(<CardCarousel cards={cards} sessionCurrentIndex={2} onResult={vi.fn()} />);
    expect(scrollToMock).toHaveBeenCalled();
  });
});
