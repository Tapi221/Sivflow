// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import React, { createRef, type RefObject } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceShell } from "@/layout/WorkspaceShell";

const runtimeState = vi.hoisted(() => ({
  isDesktop: false,
}));

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

vi.mock("@/pane.desktop/tab.desktopnative/TabsBar", () => ({
  TabsBar: () => <div data-testid="tabs-bar" />,
}));

vi.mock("@/platform/runtime", () => ({
  isDesktopRuntime: () => runtimeState.isDesktop,
}));

vi.mock("@/layout/WorkspaceBreadcrumbBar", () => ({
  WorkspaceBreadcrumbBar: ({ hideCrumbs }: { hideCrumbs?: boolean }) => <div className={hideCrumbs ? "workspace-breadcrumb-bar--collapsed" : ""} data-testid="workspace-breadcrumb" />,
}));

afterEach(() => {
  cleanup();
  runtimeState.isDesktop = false;
});

describe("WorkspaceShell の行レイアウト", () => {
  it("タブ非表示時は without-tabs クラスで breadcrumb と main だけを直接配置する", () => {
    runtimeState.isDesktop = false;

    const { shell } = renderWorkspaceShell();

    expect(shell.className).toContain("workspace-shell--without-tabs");
    expect(shell.className).not.toContain("workspace-shell--with-tabs");
    expect(screen.queryByTestId("tabs-bar")).toBeNull();
    expect(screen.getByTestId("workspace-breadcrumb")).not.toBeNull();
    expect(screen.getByRole("main")).not.toBeNull();
    expect(Array.from(shell.children).map((child) => child.className)).toEqual([
      "workspace-breadcrumb-bar--collapsed",
      "workspace-shell__main app-layout__main",
    ]);
  });

  it("タブ表示時は tabs / breadcrumb / main の3行構造にする", () => {
    runtimeState.isDesktop = true;

    const { shell } = renderWorkspaceShell();

    expect(shell.className).toContain("workspace-shell--with-tabs");
    expect(shell.className).not.toContain("workspace-shell--without-tabs");
    expect(screen.getByTestId("tabs-bar")).not.toBeNull();
    expect(Array.from(shell.children).map((child) => child.className)).toEqual([
      "workspace-shell__tabs",
      "workspace-breadcrumb-bar--collapsed",
      "workspace-shell__main app-layout__main",
    ]);
  });

  it("without-tabs 用のCSSで main が暗黙行に落ちないようにする", () => {
    const appLayoutCss = readFileSync(APP_LAYOUT_CSS_PATH, "utf8");

    expect(appLayoutCss).toMatch(/\.workspace-shell--without-tabs\s*{[\s\S]*?grid-template-rows:\s*auto\s*minmax\(0,\s*1fr\);[\s\S]*?}/);
    expect(appLayoutCss).toMatch(/\.workspace-breadcrumb-bar--collapsed\s*{[\s\S]*?height:\s*0;[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*hidden;[\s\S]*?}/);
  });
});
