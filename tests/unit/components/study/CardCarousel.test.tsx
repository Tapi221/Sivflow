// @vitest-environment jsdom
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Card } from "@/types";

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
  MobileScalableCard: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@constants/shared/flashcard", () => ({
  CARD_BASE_WIDTH: 480,
  CARD_DISPLAY_SCALE: 1,
  CARD_SAFE_PADDING_PX: 24,
}));

vi.mock("@/features/study/StudyCard", () => ({
  default: ({ card }: { card?: { id?: string } | null }) => (
    <div data-testid="study-card" data-card-id={card?.id ?? ""} />
  ),
}));

import { CardCarousel } from "@/features/study/CardCarousel";

function makeCard(id: string): Card {
  return { id } as unknown as Card;
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

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

const scrollToMock = vi.fn(function scrollTo(
  this: HTMLDivElement,
  options: ScrollToOptions,
) {
  this.scrollLeft = options.left ?? this.scrollLeft;
  this.dispatchEvent(new Event("scroll", { bubbles: true }));
});

class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

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
      '[data-testid="study-card"]',
    ) as HTMLElement;
    expect(center.dataset.cardId).toBe("b");
  });

  it('左右プレビューパネルに aria-hidden="true" が設定されている', () => {
    const cards = [makeCard("a"), makeCard("b"), makeCard("c")];
    const el = setup(
      <CardCarousel cards={cards} sessionCurrentIndex={1} onResult={vi.fn()} />,
    );
    const hidden = el.querySelectorAll('[aria-hidden="true"]');
    expect(hidden.length).toBeGreaterThanOrEqual(2);
  });

  it("次へボタンが先頭カードで有効になっている", () => {
    const cards = [makeCard("a"), makeCard("b"), makeCard("c")];
    setup(
      <CardCarousel cards={cards} sessionCurrentIndex={0} onResult={vi.fn()} />,
    );

    const wrapper = container.querySelector(
      'button[aria-label="次のカード"]',
    ) as HTMLButtonElement;
    expect(wrapper.disabled).toBe(false);
  });

  it("前へボタンが末尾カードで有効になっている", () => {
    const cards = [makeCard("a"), makeCard("b"), makeCard("c")];
    setup(
      <CardCarousel cards={cards} sessionCurrentIndex={2} onResult={vi.fn()} />,
    );

    const wrapper = container.querySelector(
      'button[aria-label="前のカード"]',
    ) as HTMLButtonElement;
    expect(wrapper.disabled).toBe(false);
  });

  it("先頭で ArrowLeft を押しても index が 0 未満にならない", () => {
    const cards = [makeCard("a"), makeCard("b")];
    const el = setup(
      <CardCarousel cards={cards} sessionCurrentIndex={0} onResult={vi.fn()} />,
    );

    const wrapper = el.querySelector("[aria-label]") as HTMLElement;
    flushSync(() => {
      wrapper.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
      vi.runAllTimers();
    });

    expect(
      (el.querySelector('[data-testid="study-card"]') as HTMLElement).dataset
        .cardId,
    ).toBe("a");
  });

  it("末尾で ArrowRight を押しても範囲外にならない", () => {
    const cards = [makeCard("a"), makeCard("b")];
    const el = setup(
      <CardCarousel cards={cards} sessionCurrentIndex={1} onResult={vi.fn()} />,
    );

    const wrapper = el.querySelector("[aria-label]") as HTMLElement;
    flushSync(() => {
      wrapper.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      vi.runAllTimers();
    });

    expect(
      (el.querySelector('[data-testid="study-card"]') as HTMLElement).dataset
        .cardId,
    ).toBe("b");
  });

  it("sessionCurrentIndex prop が変わると carousel が追従する", () => {
    const cards = [makeCard("a"), makeCard("b"), makeCard("c")];
    const el = setup(
      <CardCarousel cards={cards} sessionCurrentIndex={0} onResult={vi.fn()} />,
    );

    expect(
      (el.querySelector('[data-testid="study-card"]') as HTMLElement).dataset
        .cardId,
    ).toBe("a");

    rerender(
      <CardCarousel cards={cards} sessionCurrentIndex={2} onResult={vi.fn()} />,
    );

    expect(
      (el.querySelector('[data-testid="study-card"]') as HTMLElement).dataset
        .cardId,
    ).toBe("c");
  });
});
