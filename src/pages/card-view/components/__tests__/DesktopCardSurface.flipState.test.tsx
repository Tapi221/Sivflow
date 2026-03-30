// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DesktopCardSurface } from "@/pages/card-view/components/DesktopCardSurface";
import type { Card } from "@/types";

const flashcardPropsSpy = vi.hoisted(() => vi.fn());

vi.mock("@/components/card/frame/Flashcard", () => ({
  Flashcard: (props: unknown) => {
    flashcardPropsSpy(props);
    return <div data-testid="mock-flashcard" />;
  },
}));

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    title: "title",
    questionText: "Q",
    answerText: "A",
    questionBlocks: [],
    answerBlocks: [],
    ...overrides,
  } as Card;
}

describe("DesktopCardSurface flip state", () => {
  it("keeps flipped state when card becomes inactive (preview mode)", () => {
    flashcardPropsSpy.mockClear();

    const props = {
      card: makeCard(),
      isGlobalEditing: false,
      editPaneWidthPx: 900,
      settings: null,
      isFlipped: true,
      folderId: null,
      cardSetId: null,
      cardsOverride: undefined,
      mountEditor: false,
      saveSignal: 0,
      onFlip: vi.fn(),
      onEdit: vi.fn(),
      onToggleUncertainty: vi.fn(),
      onToggleBookmark: vi.fn(),
    } as const;

    const { rerender } = render(
      <DesktopCardSurface {...props} isActive={true} />,
    );

    const activeCall = flashcardPropsSpy.mock.calls.at(-1)?.[0] as
      | { isFlipped?: boolean; previewMode?: boolean }
      | undefined;
    expect(activeCall?.isFlipped).toBe(true);
    expect(activeCall?.previewMode).toBe(false);

    rerender(<DesktopCardSurface {...props} isActive={false} />);

    const inactiveCall = flashcardPropsSpy.mock.calls.at(-1)?.[0] as
      | { isFlipped?: boolean; previewMode?: boolean }
      | undefined;
    expect(inactiveCall?.isFlipped).toBe(true);
    expect(inactiveCall?.previewMode).toBe(true);
  });
});

