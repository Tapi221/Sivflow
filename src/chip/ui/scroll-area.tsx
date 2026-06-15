import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";



type ScrollAreaProps = React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
  viewportClassName?: string;
  viewportProps?: Omit<React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Viewport>, "children">;
  viewportRef?: React.Ref<React.ElementRef<typeof ScrollAreaPrimitive.Viewport>>;
};



const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none p-0.5 transition-colors",
      orientation === "vertical" && "h-full w-2",
      orientation === "horizontal" && "h-2 flex-col",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-slate-300 transition-colors hover:bg-slate-400 active:bg-slate-500" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({
  className,
  children,
  type = "hover",
  scrollHideDelay = 100,
  viewportClassName,
  viewportProps,
  viewportRef,
  ...props
}, ref) => {
  const { className: viewportPropsClassName, ...restViewportProps } = viewportProps ?? {};
  return (
    <ScrollAreaPrimitive.Root
      ref={ref}
      type={
        type}
      scrollHideDelay={scrollHideDelay}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        className={cn("h-full w-full rounded-lg", viewportClassName, viewportPropsClassName)}
        {...restViewportProps}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
});



ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

export { ScrollArea };
