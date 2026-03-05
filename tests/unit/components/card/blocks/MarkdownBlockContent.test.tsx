// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MarkdownBlockContent } from "@/components/card/blocks/MarkdownBlockContent";

afterEach(() => {
  cleanup();
});

describe("MarkdownBlockContent", () => {
  it("段落間の空行は24pxになる", () => {
    const { container } = render(
      <MarkdownBlockContent markdown={"first\n\nsecond"} />,
    );

    const root = container.querySelector(
      ".markdownBlockCardView",
    ) as HTMLElement | null;
    const secondParagraph = root?.querySelector("p + p") as HTMLElement | null;

    expect(root).toBeTruthy();
    expect(secondParagraph).toBeTruthy();
    expect(getComputedStyle(secondParagraph as Element).marginTop).toBe("24px");
  });

  it("異なるブロック種別間の空行も24pxになる", () => {
    const { container } = render(
      <MarkdownBlockContent markdown={"paragraph\n\n- item"} />,
    );

    const root = container.querySelector(
      ".markdownBlockCardView",
    ) as HTMLElement | null;
    const list = root?.querySelector("p + ul") as HTMLElement | null;

    expect(root).toBeTruthy();
    expect(list).toBeTruthy();
    expect(getComputedStyle(list as Element).marginTop).toBe("24px");
  });
});
