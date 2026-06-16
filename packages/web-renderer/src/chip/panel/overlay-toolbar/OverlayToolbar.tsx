import { cn } from "@web-renderer/lib/utils";
import type { PropsWithChildren } from "react";
import { overlayGlassToolbarClassName } from "@/components/card/shell/overlaySurfaceClassNames";

type OverlayToolbarProps = PropsWithChildren<{
  className?: string;
}>;

const OverlayToolbar = ({ className, children }: OverlayToolbarProps) => {
  return (<div className={cn(overlayGlassToolbarClassName, "gap-1.5 px-2 py-1", className)} data-card-zoom-input-ignore="true" > {children} </div>);
};

export { OverlayToolbar };
