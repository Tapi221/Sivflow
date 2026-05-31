import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = resolve(process.cwd(), "src/pane.desktop/leftpane/folder/LayeredDirectorySidebar.tsx");

const getFunctionSource = (source: string, functionName: string): string => {
  const marker = `const ${functionName} =`;
  const start = source.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);

  const nextConst = source.indexOf("\nconst ", start + marker.length);
  expect(nextConst).toBeGreaterThan(start);

  return source.slice(start, nextConst);
};

describe("LayeredDirectorySidebar project list", () => {
  it("does not render project content count badges", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");
    const projectListItemSource = getFunctionSource(source, "ProjectListItem");
    const projectListSidebarSource = getFunctionSource(source, "ProjectListSidebar");

    expect(projectListItemSource).not.toContain("contentCount");
    expect(projectListItemSource).not.toContain("rounded-full");
    expect(projectListSidebarSource).not.toContain("getFolderContentCount");
  });
});
