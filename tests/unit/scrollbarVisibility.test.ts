import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SCROLLBAR_STYLE_PATHS = [
  "src/styles/index.css",
  "src/styles/base/base.css",
] as const;

const readStyleFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const extractRuleBody = (css: string, selector: string) => {
  const rulePattern = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`);
  const match = css.match(rulePattern);

  return match?.[1]?.trim() ?? "";
};

const extractCustomPropertyValue = (css: string, propertyName: string) => {
  const propertyPattern = new RegExp(`${propertyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`);
  const match = css.match(propertyPattern);

  return match?.[1]?.trim() ?? "";
};

const extractRuleSelectors = (css: string, declaration: string) => {
  const rules = css.match(/[^{}]+\{[^{}]*\}/g) ?? [];

  return rules
    .filter((rule) => rule.includes(declaration))
    .map((rule) => rule.slice(0, Math.max(0, rule.indexOf("{"))).trim());
};

const expectScrollbarRevealSelectorsToUseHoverOnly = (css: string) => {
  const revealSelectors = [
    ...extractRuleSelectors(css, "scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track)"),
    ...extractRuleSelectors(css, "background-color: var(--scrollbar-thumb)"),
    ...extractRuleSelectors(css, "background: var(--scrollbar-thumb)"),
  ];

  expect(revealSelectors.length).toBeGreaterThan(0);

  for (const selector of revealSelectors) {
    expect(selector).toContain(":hover");
    expect(selector).not.toContain(":focus-within");
    expect(selector).not.toContain(":active");
  }
};

describe("グローバルCSSではネイティブスクロールバーを 1px にし、hover 時だけ表示する", () => {
  it("スクロールバーの太さを決める --scrollbar-size の値を 1px に固定する", () => {
    const css = readStyleFile("src/styles/index.css");

    expect(extractCustomPropertyValue(css, "--scrollbar-size")).toBe("1px");
  });

  it("WebKit 系ブラウザのスクロールバー幅と高さを --scrollbar-size で制御する", () => {
    const css = readStyleFile("src/styles/index.css");
    const scrollbarRuleBody = extractRuleBody(css, "*::-webkit-scrollbar");

    expect(scrollbarRuleBody).toContain("width: var(--scrollbar-size);");
    expect(scrollbarRuleBody).toContain("height: var(--scrollbar-size);");
  });

  it("通常時は透明で、hover 時だけスクロールバーのつまみを表示し、focus-within と active では表示しない", () => {
    for (const path of SCROLLBAR_STYLE_PATHS) {
      expectScrollbarRevealSelectorsToUseHoverOnly(readStyleFile(path));
    }
  });

  it("非表示スクロールバーはスクロールバー溝を予約しない共通レイアウトにする", () => {
    const css = readStyleFile("src/styles/index.css");
    const hiddenRuleBody = extractRuleBody(css, ".scrollbar-hidden,\n.calendar-year-view");
    const hiddenWebkitRuleBody = extractRuleBody(css, ".scrollbar-hidden::-webkit-scrollbar,\n.calendar-year-view::-webkit-scrollbar");

    expect(hiddenRuleBody).toContain("scrollbar-gutter: auto;");
    expect(hiddenRuleBody).toContain("scrollbar-width: none;");
    expect(hiddenRuleBody).not.toContain("scrollbar-gutter: stable;");
    expect(hiddenWebkitRuleBody).toContain("display: none;");
    expect(hiddenWebkitRuleBody).toContain("width: 0;");
    expect(hiddenWebkitRuleBody).toContain("height: 0;");
  });

  it("コードブロックは独自CSSではなく共通の scrollbar-hidden を使う", () => {
    const frame = readStyleFile("src/components/card/blocks/code/CodeBlockFrame.tsx");
    const css = readStyleFile("src/styles/features/codeblock.css");

    expect(frame).toContain("codeBlockBody codeBlockBody--withHeader scrollbar-hidden relative");
    expect(css).not.toContain(".codeBlockBody::-webkit-scrollbar");
    expect(css).not.toContain("scrollbar-width: none");
    expect(css).not.toContain("-ms-overflow-style: none");
  });
});