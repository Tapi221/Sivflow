import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { Editor, EditorContainer } from "@/chip/ui/plate/editor";
import { TableKit } from "@/components/editor/plugins/table-kit";

const TABLE_VALUE: Value = [
  {
    id: "table-1",
    type: "table",
    children: [
      {
        id: "row-1",
        type: "tr",
        children: [
          {
            id: "cell-1",
            type: "td",
            children: [
              {
                id: "paragraph-1",
                type: "p",
                children: [{ text: "Table cell" }],
              },
            ],
          },
        ],
      },
    ],
  },
];

beforeAll(() => {
  class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }

  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    value: ResizeObserverMock,
  });
});

afterEach(() => {
  cleanup();
});

describe("PlateEditor table rendering", () => {
  it("renders a table document without requiring a missing table store provider", () => {
    const MinimalTableEditor = () => {
      const editor = usePlateEditor({
        plugins: TableKit,
        value: TABLE_VALUE,
      });

      return (
        <Plate editor={editor}>
          <EditorContainer>
            <Editor />
          </EditorContainer>
        </Plate>
      );
    };

    render(<MinimalTableEditor />);

    expect(screen.getByText("Table cell")).not.toBeNull();
  });
});
