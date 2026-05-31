import type { CSSProperties, ReactNode, RefObject } from "react";
import { TabsBar } from "@/pane.desktop/tab.desktopnative/TabsBar";
import { isDesktopRuntime } from "@/platform/runtime";

type WorkspaceShellProps = {
  children: ReactNode;
  isScrollLocked: boolean;
  mainRef: RefObject<HTMLElement | null>;
};

const tabsBackgroundStyle: CSSProperties = {
  background: "var(--backpane-bg)",
};

export const WorkspaceShell = ({
  children,
  isScrollLocked,
  mainRef,
}: WorkspaceShellProps) => {
  const showTabs = isDesktopRuntime();

  return (
    <div
      className={[
        "workspace-shell app-layout__content",
        showTabs ? "workspace-shell--with-tabs" : "workspace-shell--without-tabs",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showTabs ? (
        <div className="workspace-shell__tabs" style={tabsBackgroundStyle}>
          <TabsBar />
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
