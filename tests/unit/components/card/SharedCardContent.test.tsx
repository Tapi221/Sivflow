// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SharedCardContent } from "@/components/card/common/SharedCardContent";
import type { CardBlock } from "@/types/domain/card";

vi.mock("@/components/card/common/SharedCardViewScene", () => ({
  SharedCardViewScene: () => <div data-testid="shared-card-view-scene" />,
}));

vi.mock("@/components/card/common/SharedCardEditScene", () => ({
  SharedCardEditScene: () => <div data-testid="shared-card-edit-scene" />,
}));

describe("SharedCardContent", () => {
  const blocks: CardBlock[] = [
    { id: "b-1", type: "text", orderIndex: 0, content: "hello" },
  ];

  it("view mode では共有 root と view scene を描画する", () => {
    const { container } = render(
      <SharedCardContent mode="view" blocks={blocks} />,
    );

    expect(container.querySelector(".card-content-root")).toBeTruthy();
    expect(screen.getByTestId("shared-card-view-scene")).toBeTruthy();
  });

  it("edit mode では共有 root と edit scene を描画する", () => {
    const { container } = render(
      <SharedCardContent
        mode="edit"
        blocks={blocks}
        onChange={() => {}}
        prefix="question"
        label="問題"
      />,
    );

    expect(container.querySelector(".card-content-root")).toBeTruthy();
    expect(screen.getByTestId("shared-card-edit-scene")).toBeTruthy();
  });
});
