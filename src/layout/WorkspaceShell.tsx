import type { CSSProperties, ReactNode, RefObject } from "react";

import { WorkspaceTabsBar } from "@/features/tab/TabsBar";

import { WorkspaceBreadcrumbBar } from "./WorkspaceBreadcrumbBar";

type WorkspaceShellProps = {
  children: ReactNode;
  isScrollLocked: boolean;
  mainRef: RefObject<HTMLElement | null>;
};

const tabsBackgroundStyle: CSSProperties = {
  background: "var(--app-sidebar-bg)",
};

export const WorkspaceShell = ({
  children,
  isScrollLocked,
  mainRef,
}: WorkspaceShellProps) => {
  return (
    <div className="workspace-shell app-layout__content workspace-shell--with-tabs">
      <div className="workspace-shell__tabs" style={tabsBackgroundStyle}>
        <WorkspaceTabsBar />
      </div>
      <WorkspaceBreadcrumbBar hideCrumbs />

      <main
        ref={mainRef}
        className={[
          "workspace-shell__main app-layout__main",
          isScrollLocked ? "app-layout__main--locked" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </main>
    </div>
  );
};
