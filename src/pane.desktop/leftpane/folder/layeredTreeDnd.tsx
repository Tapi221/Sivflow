import { cn } from "@web-renderer/lib/utils";
import type { LayeredTreeDropPosition } from "./layeredTreeDnd.types";



const LayeredTreeDropIndicator = ({ position, left, className }: { position: Exclude<LayeredTreeDropPosition, "inside">; left: number; className?: string; }) => (
  <span aria-hidden="true" className={cn("pointer-events-none absolute left-0 right-2 z-10 flex h-0.5 items-center", position === "before" && "top-0", position === "after" && "bottom-0", position === "append" && "relative right-auto my-1", className)} style={{ paddingLeft: left }}>
    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8f8f8f]" />
    <span className="h-0.5 min-w-0 flex-1 rounded-full bg-[#8f8f8f]" />
  </span>
);



export { LayeredTreeDropIndicator };
