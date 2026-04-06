import {
  expandTabsInEligibleMarkdownLines,
  normalizeMarkdownEditorValue,
  resolveMarkdownTabKeyText,
} from "@/utils/markdownWhitespace";
import { describe, expect, it } from "vitest";

describe("markdownWhitespace", () => {
  it("本文段落ではタブを設定値のスペースへ展開する", () => {
    const actual = expandTabsInEligibleMarkdownLines("a\tb", 2);
    expect(actual).toBe("a  b");
  });

  it("引用内本文でもタブを設定値のスペースへ展開する", () => {
    const actual = expandTabsInEligibleMarkdownLines("> a\tb", 4);
    expect(actual).toBe("> a    b");
  });

  it("インラインコード内のタブは保持し、同一段落の通常テキストだけ展開する", () => {
    const actual = expandTabsInEligibleMarkdownLines(
      "before `code\there` after\tend",
      2,
    );

    expect(actual).toBe("before `code\there` after  end");
  });

  it("コードフェンス内のタブは保持する", () => {
    const actual = expandTabsInEligibleMarkdownLines(
      "```ts\nconst\tvalue = 1;\n```",
      2,
    );

    expect(actual).toBe("```ts\nconst\tvalue = 1;\n```");
  });

  it("ATX 見出し行のタブは保持する", () => {
    const actual = expandTabsInEligibleMarkdownLines("#\tHeading", 2);
    expect(actual).toBe("#\tHeading");
  });

  it("Setext 見出し本文のタブは保持する", () => {
    const actual = expandTabsInEligibleMarkdownLines("Heading\tText\n====", 2);
    expect(actual).toBe("Heading\tText\n====");
  });

  it("リスト行のタブは保持する", () => {
    const actual = expandTabsInEligibleMarkdownLines("-\titem", 2);
    expect(actual).toBe("-\titem");
  });

  it("引用内リスト行のタブは保持する", () => {
    const actual = expandTabsInEligibleMarkdownLines("> -\titem", 2);
    expect(actual).toBe("> -\titem");
  });

  it("表行のタブは保持する", () => {
    const actual = expandTabsInEligibleMarkdownLines("| a\tb | c |", 2);
    expect(actual).toBe("| a\tb | c |");
  });

  it("editor value 正規化では nbsp を通常スペースへ変換し、末尾改行を落とす", () => {
    const actual = normalizeMarkdownEditorValue("a\u00A0b\n\n", 2);
    expect(actual).toBe("a b");
  });

  it("本文段落では Tab キー入力がスペースへ変わる", () => {
    const actual = resolveMarkdownTabKeyText("hello", 2, 4);
    expect(actual).toBe("    ");
  });

  it("インラインコード内では Tab キー入力が literal tab になる", () => {
    const actual = resolveMarkdownTabKeyText("before `code` after", 9, 2);
    expect(actual).toBe("\t");
  });

  it("コードフェンス内では Tab キー入力が literal tab になる", () => {
    const actual = resolveMarkdownTabKeyText(
      "```ts\nconst value = 1;\n```",
      8,
      2,
    );

    expect(actual).toBe("\t");
  });
});
