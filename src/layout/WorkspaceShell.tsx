import type { ReactNode, RefObject } from "react";

import { WorkspaceTabsBar } from "@/features/workspace-tabs/components/WorkspaceTabsBar";
import { WorkspaceBreadcrumbBar } from "./WorkspaceBreadcrumbBar";

type WorkspaceShellProps = {
  children: ReactNode;
  isScrollLocked: boolean;
  mainRef: RefObject<HTMLElement | null>;
};

export const WorkspaceShell = ({
  children,
  isScrollLocked,
  mainRef,
}: WorkspaceShellProps) => {
  return (
    <div className="workspace-shell app-layout__content workspace-shell--with-tabs">
      <div className="workspace-shell__tabs">
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
