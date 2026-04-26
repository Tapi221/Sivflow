import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type WorkspaceSurfaceProps = {
  children: ReactNode;
  tabs: ReactNode;
  className?: string;
  bodyClassName?: string;
  style?: CSSProperties;
};

/**
 * Owns the workspace chrome boundary.
 *
 * The tabs row remains a chrome row. The active panel body owns the shared
 * border/background/radius underneath it, so feature panels do not draw their
 * own outer shell.
 */
export const WorkspaceSurface = ({
  children,
  tabs,
  className,
  bodyClassName,
  style,
}: WorkspaceSurfaceProps) => {
  return (
    <section
      style={style}
      className={cn(
        "relative flex h-full min-h-0 min-w-0 max-w-none flex-col overflow-hidden bg-transparent",
        className,
      )}
    >
      {tabs}

      <div
        className={cn(
          "relative z-10 -mt-px flex min-h-0 w-full min-w-0 flex-1 overflow-hidden",
          "rounded-b-[14px] border-x border-b border-[#dddcd5] bg-[rgba(255,255,255,0.96)]",
          "[&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
};
