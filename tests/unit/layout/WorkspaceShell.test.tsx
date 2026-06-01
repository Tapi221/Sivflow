// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import React, { createRef, type RefObject } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { WorkspaceShell } from "@/layout/WorkspaceShell";

const APP_LAYOUT_CSS_PATH = resolve(process.cwd(), "src/layout/AppLayout.css");

const renderWorkspaceShell = (mainRef: RefObject<HTMLElement | null> = createRef<HTMLElement>()) => {
  const result = render(
    <WorkspaceShell isScrollLocked={false} mainRef={mainRef}>
      <div data-testid="workspace-content" />
    </WorkspaceShell>,
  );

  return {
    ...result,
    shell: result.container.querySelector(".workspace-shell") as HTMLElement,
  };
};

afterEach(() => {
  cleanup();
});

describe("WorkspaceShell の行レイアウト", () => {
  it("タブなしの単一行構造で main だけを直接配置する", () => {
    const { shell } = renderWorkspaceShell();

    expect(shell.className).toContain("workspace-shell--without-tabs");
    expect(shell.className).not.toContain("workspace-shell--with-tabs");
    expect(screen.getByRole("main")).not.toBeNull();
    expect(Array.from(shell.children).map((child) => child.className)).toEqual([
      "workspace-shell__main app-layout__main",
    ]);
  });

  it("without-tabs 用のCSSで main を単一グリッド行に配置する", () => {
    const appLayoutCss = readFileSync(APP_LAYOUT_CSS_PATH, "utf8");

    expect(appLayoutCss).toMatch(/\.workspace-shell--without-tabs\s*{[\s\S]*?grid-template-rows:\s*minmax\(0,\s*1fr\);[\s\S]*?}/);
  });
});
