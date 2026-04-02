// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MarkdownBlockContent } from "@/components/card/blocks/MarkdownBlockContent";

afterEach(() => {
  cleanup();
});

describe("MarkdownBlockContent", () => {
  it("Markdown本文は常に左揃えになる", () => {
    const { container } = render(
      <MarkdownBlockContent markdown={"first\n\nsecond"} align="center" />,
    );

    const root = container.querySelector(
      ".markdownBlockCardView",
    ) as HTMLElement | null;
    const paragraph = root?.querySelector("p") as HTMLElement | null;

    expect(root).toBeTruthy();
    expect(paragraph).toBeTruthy();
    expect(root?.className).toContain("text-left");
    expect(root?.className).not.toContain("text-center");
    expect(paragraph?.className).toContain("text-left");
    expect(paragraph?.className).not.toContain("text-center");
  });

  it("複数段落を個別の p 要素として描画する", () => {
    const { container } = render(
      <MarkdownBlockContent markdown={"first\n\nsecond"} />,
    );

    const root = container.querySelector(
      ".markdownBlockCardView",
    ) as HTMLElement | null;
    const paragraphs = root?.querySelectorAll("p") ?? [];

    expect(root).toBeTruthy();
    expect(paragraphs).toHaveLength(2);
  });

  it("段落の後にリストを別ブロックとして描画する", () => {
    const { container } = render(
      <MarkdownBlockContent markdown={"paragraph\n\n- item"} />,
    );

    const root = container.querySelector(
      ".markdownBlockCardView",
    ) as HTMLElement | null;
    const paragraph = root?.querySelector("p") as HTMLElement | null;
    const list = root?.querySelector("p + ul") as HTMLElement | null;

    expect(root).toBeTruthy();
    expect(paragraph).toBeTruthy();
    expect(list).toBeTruthy();
  });
});
