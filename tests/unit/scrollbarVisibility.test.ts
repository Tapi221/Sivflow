import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type CssRule = { selectors: string[]; body: string };

const SCROLLBAR_STYLE_PATHS = [
  "src/styles/index.css",
  "src/styles/base/base.css",
] as const;
const HIDDEN_SCROLLBAR_SELECTORS = [".scrollbar-hidden", ".calendar-year-view"] as const;
const HIDDEN_WEBKIT_SCROLLBAR_SELECTORS = [".scrollbar-hidden::-webkit-scrollbar", ".calendar-year-view::-webkit-scrollbar"] as const;

const readStyleFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const parseCssRules = (css: string): CssRule[] => {
  const rules = css.match(/[^{}]+\{[^{}]*\}/g) ?? [];

  return rules.map((rule) => {
    const bodyStartIndex = rule.indexOf("{");
    const bodyEndIndex = rule.lastIndexOf("}");
    const selectorText = rule.slice(0, Math.max(0, bodyStartIndex)).trim();
    const body = rule.slice(bodyStartIndex + 1, bodyEndIndex).trim();

    return {
      selectors: selectorText.split(",").map((selector) => selector.trim()).filter(Boolean),
      body,
    };
  });
};

const extractRuleBody = (css: string, selector: string) => parseCssRules(css).find((rule) => rule.selectors.length === 1 && rule.selectors[0] === selector)?.body ?? "";

const extractRuleBodiesBySelector = (css: string, selector: string) => parseCssRules(css).filter((rule) => rule.selectors.includes(selector)).map((rule) => rule.body);

const extractCustomPropertyValue = (css: string, propertyName: string) => {
  const propertyPattern = new RegExp(`${propertyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\s*:\s*([^;]+);`);
  const match = css.match(propertyPattern);

  return match?.[1]?.trim() ?? "";
};

const extractRuleSelectors = (css: string, declaration: string) => parseCssRules(css).filter((rule) => rule.body.includes(declaration)).flatMap((rule) => rule.selectors);

const expectSelectorRuleBodiesToContain = (css: string, selector: string, declarations: readonly string[]) => {
  const ruleBodies = extractRuleBodiesBySelector(css, selector);
  const ruleBody = ruleBodies.join("\n");

  expect(ruleBodies.length).toBeGreaterThan(0);
  for (const declaration of declarations) {
    expect(ruleBody).toContain(declaration);
  }
};

const expectHiddenScrollbarSelectorToNotReserveGutter = (css: string, selector: string) => {
  const ruleBodies = extractRuleBodiesBySelector(css, selector);
  const ruleBody = ruleBodies.join("\n");

  expect(ruleBodies.length).toBeGreaterThan(0);
  expect(ruleBody).toContain("scrollbar-gutter: auto;");
  expect(ruleBody).toContain("scrollbar-width: none;");
  expect(ruleBody).not.toContain("scrollbar-gutter: stable;");
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

    for (const selector of HIDDEN_SCROLLBAR_SELECTORS) {
      expectHiddenScrollbarSelectorToNotReserveGutter(css, selector);
    }
    for (const selector of HIDDEN_WEBKIT_SCROLLBAR_SELECTORS) {
      expectSelectorRuleBodiesToContain(css, selector, ["display: none;", "width: 0;", "height: 0;"]);
    }
  });

  it("コードブロックは専用CSSを維持し、共通 scrollbar-hidden を付けない", () => {
    const frame = readStyleFile("src/components/card/blocks/code/CodeBlockFrame.tsx");
    const css = readStyleFile("src/styles/features/codeblock.css");

    expect(frame).toContain("codeBlockBody codeBlockBody--withHeader relative");
    expect(frame).not.toContain("codeBlockBody codeBlockBody--withHeader scrollbar-hidden relative");
    expect(css).toContain(".codeBlockBody::-webkit-scrollbar");
    expect(css).toContain("scrollbar-width: none");
    expect(css).toContain("-ms-overflow-style: none");
  });
});