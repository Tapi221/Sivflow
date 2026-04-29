import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ExplorerWorkspaceFrameProps = {
  children: ReactNode;
  tabs?: ReactNode;
  className?: string;
  bodyClassName?: string;
  style?: CSSProperties;
  showExplorerChrome?: boolean;
};

export const ExplorerWorkspaceFrame = ({
  children,
  tabs = null,
  className,
  bodyClassName,
  style,
  showExplorerChrome: _showExplorerChrome = true,
}: ExplorerWorkspaceFrameProps) => {
  return (
    <section
      style={style}
      className={cn(
        "relative flex h-full min-h-0 min-w-0 max-w-none flex-col overflow-hidden rounded-none border-0 shadow-none",
        "bg-[var(--app-bg)]",
        className,
      )}
    >
      {tabs}

      <div
        className={cn(
          "explorer-chrome-body relative flex min-h-0 w-full min-w-0 flex-1 overflow-hidden",
          "bg-transparent",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
};
