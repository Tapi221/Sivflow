import { describe, expect, it } from "vitest";
import codeBlockCss from "@/styles/features/codeblock.css?raw";

const BODY_SELECTOR = "codeBlockBody";

const readBodyRule = () => {
  const start = codeBlockCss.indexOf(BODY_SELECTOR);
  const end = start >= 0 ? codeBlockCss.indexOf("}", start) : -1;

  return start >= 0 && end >= 0 ? codeBlockCss.slice(start, end) : "";
};

describe("コードブロックのスクロール伝播", () => {
  it("縦ホイールはカード一覧へ流し、横スクロールだけコードブロック内に閉じる", () => {
    const rule = readBodyRule();

    expect(rule).toContain("overflow-x: auto;");
    expect(rule).toContain("overflow-y: hidden;");
    expect(rule).toContain("overscroll-behavior-x: contain;");
    expect(rule).toContain("overscroll-behavior-y: auto;");
    expect(rule).not.toContain("overscroll-behavior: contain;");
  });
});
