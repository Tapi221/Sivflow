import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CALENDAR_CSS_PATH = resolve(process.cwd(), "src/styles/features/calendar.css");
const EXPECTED_GRID_COLUMN_WIDTH = "14.2857142857%";
const EXPECTED_GRID_LINE_COLOR = "#eeeeee";
const EXPECTED_GRID_LINE_WIDTH = "1px";
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

describe("month calendar grid style", () => {
  it("month grid line token を calendar grid 全体で共有する", () => {
    const monthViewRule = extractCssRule(calendarCss, ".calendar-month-view");

    expect(monthViewRule).toContain(`--calendar-month-grid-column-width: ${EXPECTED_GRID_COLUMN_WIDTH};`);
    expect(monthViewRule).toContain(`--calendar-month-grid-line-color: ${EXPECTED_GRID_LINE_COLOR};`);
    expect(monthViewRule).toContain(`--calendar-month-grid-line-width: ${EXPECTED_GRID_LINE_WIDTH};`);
  });

  it("月全体に連続した縦線を描画する", () => {
    const gridRule = extractCssRule(calendarCss, ".calendar-month-grid::before");

    expect(gridRule).toContain("position: absolute;");
    expect(gridRule).toContain("inset: 0;");
    expect(gridRule).toContain("pointer-events: none;");
    expect(gridRule).toContain("background-image: repeating-linear-gradient(");
    expect(gridRule).toContain("to right");
    expect(gridRule).toContain("var(--calendar-month-grid-column-width)");
    expect(gridRule).toContain("var(--calendar-month-grid-line-width)");
    expect(gridRule).toContain("var(--calendar-month-grid-line-color)");
  });

  it("spacer は横線だけを描画し、縦線は month grid に委譲する", () => {
    const spacerRule = extractCssRule(calendarCss, ".calendar-month-grid-spacer::before");

    expect(spacerRule).toContain("background-image: repeating-linear-gradient(");
    expect(spacerRule).toContain("to bottom");
    expect(spacerRule).not.toContain("to right");
    expect(spacerRule).toContain("var(--calendar-month-grid-line-width)");
    expect(spacerRule).toContain("var(--calendar-month-grid-line-color)");
  });
});