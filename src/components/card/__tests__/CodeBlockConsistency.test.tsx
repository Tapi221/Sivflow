// @vitest-environment jsdom
import { BlockRenderer } from "@/components/card/blocks/BlockRenderer";
import { CodeBlockEditor } from "@/components/card/blocks/CodeBlockEditor";
import { CodeBlockItem } from "@/components/card/blocks/CodeBlockItem";
import { MarkdownBlockView } from "@/components/card/blocks/MarkdownBlockPreview";
import type { CardBlock } from "@/types/domain/card
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  cleanup();
});

const LONG_LINE = `const veryLongLine = "${"x".repeat(240)}";`;

describe("Code block consistency", () => {
  it("long single-line code keeps no-wrap and horizontal scroll classes", () => {
    const { container } = render(
      <BlockRenderer
        blocks={[
          {
            id: "code-1",
            type: "code",
            orderIndex: 0,
            code: { language: "javascript", code: LONG_LINE },
          } as CardBlock,
        ]}
      />,
    );

    const body = container.querySelector(".codeBlockBody");
    const pre = container.querySelector("pre");
    const code = container.querySelector("pre code");
    expect(body).toBeTruthy();
    expect(pre).toBeTruthy();
    expect(code).toBeTruthy();
    expect(body?.className ?? "").toContain("codeBlockBody");
    expect(pre?.className ?? "").toContain("codeBlockPre");
    expect(pre?.className ?? "").toContain("code-no-wrap");
    expect(code?.className ?? "").toContain("code-no-wrap");
    expect(code?.textContent ?? "").toContain(LONG_LINE);
  });

  it("editor/view/preview use the same CodeBlockFrame structure", () => {
    const edit = render(
      <CodeBlockEditor
        value={{ language: "javascript", code: "const a = 1;" }}
        onChange={() => {}}
      />,
    );
    const view = render(
      <BlockRenderer
        blocks={[
          {
            id: "code-2",
            type: "code",
            orderIndex: 0,
            code: { language: "javascript", code: "const b = 2;" },
          } as CardBlock,
        ]}
      />,
    );
    const preview = render(
      <MarkdownBlockView md={"```javascript\nconst c = 3;\n```"} />,
    );

    const editRoot = edit.container.querySelector(".codeBlockRoot");
    const viewRoot = view.container.querySelector(".codeBlockRoot");
    const previewRoot = preview.container.querySelector(".codeBlockRoot");
    expect(editRoot).toBeTruthy();
    expect(viewRoot).toBeTruthy();
    expect(previewRoot).toBeTruthy();

    expect(
      edit.container.querySelector(".codeBlockBody.codeBlockBody--withHeader"),
    ).toBeTruthy();
    expect(
      view.container.querySelector(".codeBlockBody.codeBlockBody--withHeader"),
    ).toBeTruthy();
    expect(
      preview.container.querySelector(
        ".codeBlockBody.codeBlockBody--withHeader",
      ),
    ).toBeTruthy();

    expect(view.container.querySelector(".codeBlockLang")?.textContent).toBe(
      "JS",
    );
    expect(preview.container.querySelector(".codeBlockLang")?.textContent).toBe(
      "JS",
    );
    expect(edit.container.querySelector(".codeBlockLang")).toBeNull();
  });

  it("editor contract keeps width-expanding host (no w-full) for horizontal scroll parity", () => {
    const { container } = render(
      <CodeBlockEditor
        value={{ language: "javascript", code: LONG_LINE }}
        onChange={() => {}}
      />,
    );

    const editorHost = container.querySelector(".code-editor-no-scroll");
    const textarea = container.querySelector(
      ".npm__react-simple-code-editor__textarea",
    );
    expect(editorHost).toBeTruthy();
    expect(textarea).toBeTruthy();
    expect(editorHost?.className ?? "").not.toContain("w-full");
    expect(textarea?.className ?? "").toContain("code-no-wrap");
  });

  it("code block item keeps outer wrapper spacing neutralized", () => {
    const { container } = render(
      <CodeBlockItem
        data={{ language: "javascript", code: "const z = 1;" }}
        onChange={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
      />,
    );

    const wrapper = container.firstElementChild as HTMLElement | null;
    expect(wrapper).toBeTruthy();
    expect(wrapper?.className ?? "").toContain("px-0");
    expect(wrapper?.className ?? "").toContain("border-0");
  });

  it("viewer code block is not clipped by block wrapper overflow", () => {
    const { container } = render(
      <BlockRenderer
        blocks={[
          {
            id: "code-overflow-1",
            type: "code",
            orderIndex: 0,
            code: { language: "javascript", code: LONG_LINE },
          } as CardBlock,
        ]}
      />,
    );

    const root = container.querySelector(".codeBlockRoot");
    const outer = root?.closest(".overflow-visible") as HTMLElement | null;
    expect(root).toBeTruthy();
    expect(outer).toBeTruthy();
    expect(outer?.className ?? "").toContain("overflow-visible");
  });
});




