// @vitest-environment jsdom
import { SharedCardContent } from "@/components/card/common/SharedCardContent";
import type { CardBlock } from "@/types";
import { DragDropContext } from "@hello-pangea/dnd";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../blocks/BlockRenderer", () => ({
  BlockRenderer: () => <div data-testid="mock-block-renderer" />,
}));

vi.mock("../blocks/BlockEditor", () => ({
  BlockEditor: () => <div data-testid="mock-block-editor" />,
}));

describe("SharedCardContent", () => {
  const blocks: CardBlock[] = [
    { id: "b-1", type: "text", orderIndex: 0, content: "hello" },
  ];

  it("renders view mode with shared root", () => {
    const { container } = render(
      <SharedCardContent mode="view" blocks={blocks} />,
    );

    const root = container.querySelector(".card-content-root");

    expect(root).toBeTruthy();
    expect(screen.getByTestId("mock-block-renderer")).toBeTruthy();
  });

  it("renders edit mode with the same shared root", () => {
    const { container } = render(
      <DragDropContext onDragEnd={() => {}}>
        <SharedCardContent
          mode="edit"
          blocks={blocks}
          onChange={() => {}}
          prefix="question"
          label="問題"
          color="text-indigo-500"
          droppableId="question-blocks"
        />
      </DragDropContext>,
    );

    const root = container.querySelector(".card-content-root");

    expect(root).toBeTruthy();
    expect(screen.getByTestId("mock-block-editor")).toBeTruthy();
  });
});



