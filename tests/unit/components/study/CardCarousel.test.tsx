// @vitest-environment jsdom
/**
 * CardCarousel unit tests.
 *
 * Note: This project's test environment (React 19 + vitest jsdom) does not
 * fully support `act()` from react or @testing-library/react. Tests use
 * ReactDOM.flushSync (synchronous rendering) as a workaround.
 */
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { Card } from '@/types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(function MotionDiv(
      props: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
      ref: React.Ref<HTMLDivElement>
    ) {
      const {
        animate: _a, transition: _t, drag: _d, dragConstraints: _dc,
        dragElastic: _de, onDragEnd: _ode,
        ...rest
      } = props;
      return <div ref={ref} {...rest} />;
    }),
  },
}));

vi.mock('@/components/card/Flashcard', () => ({
  Flashcard: ({ card }: { card?: { id?: string } | null }) => (
    <div data-testid="flashcard" data-card-id={card?.id ?? ''} />
  ),
}));

vi.mock('@/components/card/MobileScalableCard', () => ({
  MobileScalableCard: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/card/constants', () => ({
  CANONICAL_CARD_WIDTH: 480,
  CARD_SAFE_PADDING_PX: 24,
}));

vi.mock('@/components/study/StudyCard', () => ({
  default: ({ card }: { card?: { id?: string } | null }) => (
    <div data-testid="study-card" data-card-id={card?.id ?? ''} />
  ),
}));

// Import after mocks
import { CardCarousel } from '@/components/study/CardCarousel';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeCard(id: string): Card {
  return { id } as unknown as Card;
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function setup(element: React.ReactElement): HTMLDivElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  flushSync(() => { root.render(element); });
  return container;
}

function rerender(element: React.ReactElement) {
  flushSync(() => { root.render(element); });
}

afterEach(() => {
  flushSync(() => { root.unmount(); });
  container.remove();
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('CardCarousel', () => {
  it('中央カードが sessionCurrentIndex のカードを表示する', () => {
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')];
    const el = setup(
      <CardCarousel cards={cards} sessionCurrentIndex={1} onResult={vi.fn()} />
    );
    const center = el.querySelector('[data-testid="study-card"]') as HTMLElement;
    expect(center.dataset.cardId).toBe('b');
  });

  it('左右プレビューパネルに aria-hidden="true" が設定されている', () => {
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')];
    const el = setup(
      <CardCarousel cards={cards} sessionCurrentIndex={1} onResult={vi.fn()} />
    );
    const hidden = el.querySelectorAll('[aria-hidden="true"]');
    expect(hidden.length).toBeGreaterThanOrEqual(2);
  });

  it('ArrowRight キーで次のカードへ移動する', () => {
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')];
    const el = setup(
      <CardCarousel cards={cards} sessionCurrentIndex={0} onResult={vi.fn()} />
    );

    expect((el.querySelector('[data-testid="study-card"]') as HTMLElement).dataset.cardId).toBe('a');

    const wrapper = el.querySelector('[aria-label]') as HTMLElement;
    flushSync(() => {
      wrapper.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      );
    });

    expect((el.querySelector('[data-testid="study-card"]') as HTMLElement).dataset.cardId).toBe('b');
  });

  it('ArrowLeft キーで前のカードへ移動する', () => {
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')];
    const el = setup(
      <CardCarousel cards={cards} sessionCurrentIndex={2} onResult={vi.fn()} />
    );

    const wrapper = el.querySelector('[aria-label]') as HTMLElement;
    flushSync(() => {
      wrapper.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
      );
    });

    expect((el.querySelector('[data-testid="study-card"]') as HTMLElement).dataset.cardId).toBe('b');
  });

  it('先頭で ArrowLeft を押しても index が 0 未満にならない', () => {
    const cards = [makeCard('a'), makeCard('b')];
    const el = setup(
      <CardCarousel cards={cards} sessionCurrentIndex={0} onResult={vi.fn()} />
    );

    const wrapper = el.querySelector('[aria-label]') as HTMLElement;
    flushSync(() => {
      wrapper.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
      );
    });

    expect((el.querySelector('[data-testid="study-card"]') as HTMLElement).dataset.cardId).toBe('a');
  });

  it('末尾で ArrowRight を押しても範囲外にならない', () => {
    const cards = [makeCard('a'), makeCard('b')];
    const el = setup(
      <CardCarousel cards={cards} sessionCurrentIndex={1} onResult={vi.fn()} />
    );

    const wrapper = el.querySelector('[aria-label]') as HTMLElement;
    flushSync(() => {
      wrapper.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      );
    });

    expect((el.querySelector('[data-testid="study-card"]') as HTMLElement).dataset.cardId).toBe('b');
  });

  it('sessionCurrentIndex prop が変わると carousel が追従する', () => {
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')];
    const el = setup(
      <CardCarousel cards={cards} sessionCurrentIndex={0} onResult={vi.fn()} />
    );

    expect((el.querySelector('[data-testid="study-card"]') as HTMLElement).dataset.cardId).toBe('a');

    rerender(
      <CardCarousel cards={cards} sessionCurrentIndex={2} onResult={vi.fn()} />
    );

    expect((el.querySelector('[data-testid="study-card"]') as HTMLElement).dataset.cardId).toBe('c');
  });
});
