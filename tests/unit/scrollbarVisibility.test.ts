import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SCROLLBAR_STYLE_PATHS = [
  "src/styles/index.css",
  "src/styles/base/base.css",
] as const;

const readStyleFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

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

describe("scrollbar visibility styles", () => {
  it("keeps the shared scrollbar width thin", () => {
    expect(readStyleFile("src/styles/index.css")).toContain("--scrollbar-size: 1px;");
  });

  it("reveals global scrollbars only on hover", () => {
    for (const path of SCROLLBAR_STYLE_PATHS) {
      expectScrollbarRevealSelectorsToUseHoverOnly(readStyleFile(path));
    }
  });
});
