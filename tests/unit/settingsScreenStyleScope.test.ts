import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SETTINGS_STYLE_PATH = "src/styles/index.css";
const SETTINGS_SCREEN_SELECTOR_PREFIX = "main:is([aria-label=\"設定\"], [aria-label=\"Settings\"], [aria-label=\"设置\"])";
const SETTINGS_LABEL_TOKEN = "[aria-label=\"設定\"]";
const ARIA_HIDDEN_SELECTOR = "[aria-hidden=\"true\"]";

const readStyleFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const extractCssRuleHeaders = (css: string): string[] => {
  const headers: string[] = [];
  let startIndex = 0;
  while (startIndex < css.length) {
    const bodyStartIndex = css.indexOf("{", startIndex);
    if (bodyStartIndex === -1) break;
    const header = css.slice(startIndex, bodyStartIndex).trim();
    if (header && !header.startsWith("@")) headers.push(header);
    const bodyEndIndex = css.indexOf("}", bodyStartIndex);
    startIndex = bodyEndIndex === -1 ? bodyStartIndex + 1 : bodyEndIndex + 1;
  }
  return headers;
};
const isSettingsScreenScopedHeader = (header: string): boolean => {
  return header.split("\n").map((line) => line.trim()).filter(Boolean).every((line) => line.startsWith(SETTINGS_SCREEN_SELECTOR_PREFIX));
};

describe("設定画面のグローバルCSSスコープ", () => {
  it("設定画面用セレクタを main に限定して、サイドバー設定ボタンへ誤爆させない", () => {
    const css = readStyleFile(SETTINGS_STYLE_PATH);
    const settingsRuleHeaders = extractCssRuleHeaders(css).filter((header) => header.includes(SETTINGS_LABEL_TOKEN));
    expect(settingsRuleHeaders.length).toBeGreaterThan(0);
    for (const header of settingsRuleHeaders) {
      expect(isSettingsScreenScopedHeader(header)).toBe(true);
    }
  });
  it("aria-hidden への背景指定も設定画面 main 配下だけにする", () => {
    const css = readStyleFile(SETTINGS_STYLE_PATH);
    const ariaHiddenSettingsRuleHeaders = extractCssRuleHeaders(css).filter((header) => header.includes(SETTINGS_LABEL_TOKEN) && header.includes(ARIA_HIDDEN_SELECTOR));
    expect(ariaHiddenSettingsRuleHeaders).toEqual([`${SETTINGS_SCREEN_SELECTOR_PREFIX} ${ARIA_HIDDEN_SELECTOR}`]);
  });
});
