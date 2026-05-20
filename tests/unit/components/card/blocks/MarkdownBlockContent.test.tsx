// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { MarkdownBlockContent } from "@/components/card/blocks/markdown/MarkdownBlockContent";

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

  it("2行空行を空白段落として保持する", () => {
    const { container } = render(
      <MarkdownBlockContent markdown={"first\n\n\nsecond"} />,
    );

    const root = container.querySelector(
      ".markdownBlockCardView",
    ) as HTMLElement | null;

    const paragraphs =
      root?.querySelectorAll('p[data-markdown-paragraph="true"]') ?? [];

    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[1]?.getAttribute("aria-hidden")).toBe("true");
  });

  it("本文段落に whitespace 保持用の識別属性を付与する", () => {
    const { container } = render(
      <MarkdownBlockContent markdown={"  lead  text"} />,
    );

    const paragraph = container.querySelector(
      'p[data-markdown-paragraph="true"]',
    ) as HTMLElement | null;

    expect(paragraph).toBeTruthy();
  });

  it("blockquote 内本文にも whitespace 保持用の識別属性を付与する", () => {
    const { container } = render(
      <MarkdownBlockContent markdown={">   quote  text"} />,
    );

    const paragraph = container.querySelector(
      'blockquote > p[data-markdown-paragraph="true"]',
    ) as HTMLElement | null;

    expect(paragraph).toBeTruthy();
  });

  it("blockquote 内の nested paragraph は whitespace selector の対象外にできる DOM 形になる", () => {
    const { container } = render(
      <MarkdownBlockContent
        markdown={"> intro\n>\n> - first paragraph\n>\n>   second paragraph"}
      />,
    );

    const directParagraphs = container.querySelectorAll(
      'blockquote > p[data-markdown-paragraph="true"]',
    );
    const nestedListParagraph = container.querySelector(
      'blockquote li p[data-markdown-paragraph="true"]',
    );

    expect(directParagraphs).toHaveLength(1);
    expect(nestedListParagraph).toBeTruthy();

    const selectorMatchesNested = nestedListParagraph?.matches(
      '.markdownBlockCardView > blockquote > p[data-markdown-paragraph="true"]',
    );

    expect(selectorMatchesNested).toBe(false);
  });
});
