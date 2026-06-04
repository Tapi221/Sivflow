import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_INDEX_CSS_PATH = resolve(process.cwd(), "src/styles/components/index.css");
const CALENDAR_PRINT_PAGE_CSS_PATH = resolve(process.cwd(), "src/styles/features/calendar-print-page.css");
const CALENDAR_CSS_IMPORT = "@import \"../features/calendar.css\";";
const CALENDAR_PRINT_PAGE_CSS_IMPORT = "@import \"../features/calendar-print-page.css\";";
const componentsIndexCss = readFileSync(COMPONENTS_INDEX_CSS_PATH, "utf8");
const calendarPrintPageCss = readFileSync(CALENDAR_PRINT_PAGE_CSS_PATH, "utf8");

const extractCssRule = (source: string, selector: string): string => {
  const ruleStart = source.indexOf(`${selector} {`);
  if (ruleStart === -1) throw new Error(`CSS rule not found: ${selector}`);

  const bodyStart = source.indexOf("{", ruleStart);
  if (bodyStart === -1) throw new Error(`CSS rule body not found: ${selector}`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char !== "}") continue;

    depth -= 1;
    if (depth === 0) return source.slice(bodyStart + 1, index);
  }

  throw new Error(`CSS rule is not closed: ${selector}`);
};

describe("calendar print page style", () => {
  it("印刷用 page rule を縦向きに固定する", () => {
    const mediaPrintRule = extractCssRule(calendarPrintPageCss, "@media print");
    const pageRule = extractCssRule(mediaPrintRule, "@page");

    expect(pageRule).toContain("size: portrait;");
    expect(pageRule).not.toContain("size: landscape;");
  });

  it("calendar.css の後に import して印刷 page rule を上書きする", () => {
    const calendarImportIndex = componentsIndexCss.indexOf(CALENDAR_CSS_IMPORT);
    const printPageImportIndex = componentsIndexCss.indexOf(CALENDAR_PRINT_PAGE_CSS_IMPORT);

    expect(calendarImportIndex).toBeGreaterThanOrEqual(0);
    expect(printPageImportIndex).toBeGreaterThan(calendarImportIndex);
  });
});
