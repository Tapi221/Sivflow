import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Value } from "platejs";
import { PlateEditor } from "@/components/editor/plate-editor";

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
    render(<PlateEditor initialValue={TABLE_VALUE} onChange={vi.fn()} />);

    expect(screen.getByText("Table cell")).toBeInTheDocument();
  });
});
