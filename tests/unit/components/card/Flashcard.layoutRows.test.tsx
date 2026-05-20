// @vitest-environment jsdom
import { layoutRowsToCardHeightPx } from "@constants/shared/flashcard";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { Flashcard } from "@/components/card/frame/Flashcard";

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

    const { rerender } = render(<Flashcard card={card} isFlipped={false} />);
    const before = screen
      .getByTestId("mock-card-frame")
      .getAttribute("data-height");

    rerender(<Flashcard card={card} isFlipped={true} />);
    const after = screen
      .getByTestId("mock-card-frame")
      .getAttribute("data-height");

    expect(before).toBe(String(layoutRowsToCardHeightPx(22)));
    expect(after).toBe(String(layoutRowsToCardHeightPx(22)));
  });
});
