// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import type * as SharedCardContentModule from "@/components/card/common/SharedCardContent";
import { Flashcard } from "@/components/card/frame/Flashcard";
import type * as CardFrameModule from "@/components/card/frame/CardFrame";
import type * as ReferencePopupModule from "@/components/card/overlays/ReferencePopup";
import type * as DialogModule from "@/chip/ui/dialog/dialog";
import { layoutRowsToCardHeightPx } from "@/domain/card/cardGeometry.constants";

vi.mock("@/components/card/frame/CardFrame", () => ({
  CardFrame: ({ children, heightPx }: { children: React.ReactNode; heightPx?: number; }) => (
    <div data-testid="mock-card-frame" data-height={heightPx ?? ""}>
      {children}
    </div>
  ),
} satisfies Partial<Record<keyof typeof CardFrameModule, unknown>>));

vi.mock("@/components/card/common/SharedCardContent", () => ({
  SharedCardContent: () => <div data-testid="mock-shared-content" />,
} satisfies Partial<Record<keyof typeof SharedCardContentModule, unknown>>));

vi.mock("@/components/card/overlays/ReferencePopup", () => ({
  ReferencePopup: () => null,
} satisfies Partial<Record<keyof typeof ReferencePopupModule, unknown>>));

vi.mock("@/chip/ui/dialog/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode; }) => children,
  DialogContent: ({ children }: { children: React.ReactNode; }) => children,
} satisfies Partial<Record<keyof typeof DialogModule, unknown>>));

describe("Flashcard の layoutRows による高さ制御", () => {
  it("flip 前後で同じ高さを維持する", () => {
    const card = {
      id: "card-1",
      questionText: "Q",
      answerText: "A",
      layoutRows: 22,
      frontBlocks: [],
      backBlocks: [],
    };

    const { rerender } = render(<Flashcard card={card} isFlipped={false} />);
    const before = screen.getByTestId("mock-card-frame").getAttribute("data-height");

    rerender(<Flashcard card={card} isFlipped={true} />);
    const after = screen.getByTestId("mock-card-frame").getAttribute("data-height");

    expect(before).toBe(String(layoutRowsToCardHeightPx(22)));
    expect(after).toBe(String(layoutRowsToCardHeightPx(22)));
  });
});