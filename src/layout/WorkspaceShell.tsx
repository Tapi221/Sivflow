import type { ReactNode, RefObject } from "react";

import { WorkspaceTabsBar } from "@/features/workspace-tabs/components/WorkspaceTabsBar";

type WorkspaceShellProps = {
  children: ReactNode;
  isScrollLocked: boolean;
  mainRef: RefObject<HTMLElement | null>;
  showTabs?: boolean;
};

export const WorkspaceShell = ({
  children,
  isScrollLocked,
  mainRef,
  showTabs = false,
}: WorkspaceShellProps) => {
  return (
    <div
      className={[
        "workspace-shell app-layout__content",
        showTabs
          ? "workspace-shell--with-tabs"
          : "workspace-shell--without-tabs",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showTabs ? (
        <div className="workspace-shell__tabs">
          <WorkspaceTabsBar />
        </div>
      ) : null}

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
