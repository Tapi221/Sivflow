import type { ReactNode, RefObject } from "react";



type WorkspaceShellProps = {
  children: ReactNode;
  isScrollLocked: boolean;
  mainRef: RefObject<HTMLElement | null>;
};



const WorkspaceShell = ({ children, isScrollLocked, mainRef }: WorkspaceShellProps) => {
  return (
    <div className="workspace-shell app-layout__content workspace-shell--without-tabs">
      <main ref={mainRef} className={["workspace-shell__main app-layout__main", isScrollLocked ? "app-layout__main--locked" : ""].filter(Boolean).join(" ")}>
        {children}
      </main>
    </div>
  );
};



export { WorkspaceShell };
