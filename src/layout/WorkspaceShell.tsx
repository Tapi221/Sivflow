import type { ReactNode, RefObject } from "react";
import { TabsBar } from "@/pane.desktop/tab.desktopnative/TabsBar";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";

type WorkspaceShellProps = {
  children: ReactNode;
  isScrollLocked: boolean;
  mainRef: RefObject<HTMLElement | null>;
};

const WorkspaceShell = ({ children, isScrollLocked, mainRef }: WorkspaceShellProps) => {
  const presentationTarget = usePresentationTarget();
  const shouldShowTabs = presentationTarget === "desktop";
  const shellClassName = [
    "workspace-shell app-layout__content",
    shouldShowTabs ? "workspace-shell--with-tabs" : "workspace-shell--without-tabs",
  ].join(" ");
  const mainClassName = [
    "workspace-shell__main app-layout__main",
    isScrollLocked ? "app-layout__main--locked" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={shellClassName}>
      {shouldShowTabs ? <TabsBar variant="titlebar" className="workspace-shell__tabs" /> : null}
      <main ref={mainRef} className={mainClassName}>
        {children}
      </main>
    </div>
  );
};

export { WorkspaceShell };
