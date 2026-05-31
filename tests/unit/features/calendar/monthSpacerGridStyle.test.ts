import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CALENDAR_CSS_PATH = resolve(process.cwd(), "src/styles/features/calendar.css");
const EXPECTED_SPACER_LINE_COLOR = "#eef0f3";
const EXPECTED_SPACER_LINE_WIDTH = "0.5px";
const calendarCss = readFileSync(CALENDAR_CSS_PATH, "utf8");

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

describe("month calendar spacer grid style", () => {
  it("keeps the spacer line token at the same thin color and width used by calendar grids", () => {
    const monthViewRule = extractCssRule(calendarCss, ".calendar-month-view");

    expect(monthViewRule).toContain(`--calendar-month-spacer-line-color: ${EXPECTED_SPACER_LINE_COLOR};`);
    expect(monthViewRule).toContain(`--calendar-month-spacer-line-width: ${EXPECTED_SPACER_LINE_WIDTH};`);
  });

  it("draws the spacer background from the guaranteed line color and width tokens", () => {
    const spacerRule = extractCssRule(calendarCss, ".calendar-month-grid-spacer::before");

    expect(spacerRule).toContain("background-image: repeating-linear-gradient(");
    expect(spacerRule).toContain("var(--calendar-month-spacer-line-width)");
    expect(spacerRule).toContain("var(--calendar-month-spacer-line-color)");
    expect(spacerRule).not.toContain("#eeeeee");
    expect(spacerRule).not.toContain(" 1px");
  });
});
