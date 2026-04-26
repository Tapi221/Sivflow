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
 * Owns the workspace chrome as a single surface.
 *
 * Tabs and the active workspace panel are intentionally rendered under one
 * border/background/radius owner. Legacy child panels are neutralized at the
 * surface boundary so each feature can focus on layout/content instead of
 * drawing another outer shell.
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
        "relative flex h-full min-h-0 min-w-0 max-w-none flex-col overflow-hidden",
        "rounded-[14px] border border-[#dddcd5] bg-[rgba(255,255,255,0.96)]",
        "shadow-[0_16px_36px_rgba(15,23,42,0.055),0_4px_12px_rgba(15,23,42,0.035)]",
        className,
      )}
    >
      {tabs}

      <div
        className={cn(
          "relative z-10 -mt-px flex min-h-0 w-full min-w-0 flex-1 overflow-hidden",
          "[&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
};
