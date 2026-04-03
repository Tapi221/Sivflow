import React from "react";
import { cn } from "@/lib/utils";
import { BlockInset } from "@/components/card/blocks/editor/BlockInset";

type ImageBlockShellProps = {
  children: React.ReactNode;
  className?: string;
  showBorderOverlay?: boolean;
};

export function ImageBlockShell({
  children,
  className,
  showBorderOverlay = false,
}: ImageBlockShellProps) {
  return (
    <BlockInset variant="image">
      <div className={cn("relative rounded-[11px] overflow-hidden", className)}>
        {children}
        {showBorderOverlay && (
          <div
            className="pointer-events-none absolute inset-0 z-20 rounded-[11px] border border-slate-200/80"
            style={{ borderWidth: "var(--card-ruled-line-px, 1px)" }}
          />
        )}
      </div>
    </BlockInset>
  );
}



