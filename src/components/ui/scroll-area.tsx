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
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-[var(--scrollbar-size)] p-[var(--scrollbar-thumb-inset)]",
      orientation === "horizontal" && "h-[var(--scrollbar-size)] flex-col p-[var(--scrollbar-thumb-inset)]",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-[var(--scrollbar-radius)] bg-[var(--scrollbar-thumb)] transition-colors hover:bg-[var(--scrollbar-thumb-hover)] active:bg-[var(--scrollbar-thumb-active)]" />
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
      type={type}
      scrollHideDelay={scrollHideDelay}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        className={cn("h-full w-full rounded-[inherit]", viewportClassName, viewportPropsClassName)}
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
