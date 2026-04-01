// @vitest-environment jsdom
import { CARD_ROW_PX } from "@/components/card/common/constants";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../frame/CardFrame", () => ({
  CardFrame: ({
    children,
    heightPx,
  }: {
    children: React.ReactNode;
    heightPx?: number;
  }) => (
    <div data-testid="mock-card-frame" data-height={heightPx ?? ""}>
      {children}
    </div>
  ),
}));

vi.mock("../common/SharedCardContent", () => ({
  SharedCardContent: () => <div data-testid="mock-shared-content" />,
}));

vi.mock("../overlays/ReferencePopup", () => ({
  ReferencePopup: () => null,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("Flashcard layoutRows height behavior", () => {
  it("keeps the same height before/after flip", () => {
    const card = {
      id: "card-1",
      questionText: "Q",
      answerText: "A",
      layoutRows: 22,
      frontBlocks: [],
      backBlocks: [],
    };

    const { rerender } = render(<Flashcard card={adaptCard(card)} isFlipped={false} />);
    const before = screen
      .getByTestId("mock-card-frame")
      .getAttribute("data-height");

    rerender(<Flashcard card={adaptCard(card)} isFlipped={true} />);
    const after = screen
      .getByTestId("mock-card-frame")
      .getAttribute("data-height");

    expect(before).toBe(String(22 * CARD_ROW_PX));
    expect(after).toBe(String(22 * CARD_ROW_PX));
  });
});










