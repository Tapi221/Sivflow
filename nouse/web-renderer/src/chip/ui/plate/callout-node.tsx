import { cn } from "@web-renderer/lib/utils";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";



type CalloutNodeProps = PlateElementProps & {
  variant?: "info" | "warning" | "success" | "error";
};



const CALLOUT_ICON_BY_VARIANT: Record<NonNullable<CalloutNodeProps["variant"]>, string> = {
  info: "i",
  warning: "!",
  success: "✓",
  error: "!",
};



const getCalloutVariant = (variant: CalloutNodeProps["variant"]) => variant ?? "info";



const CalloutNode = ({ className, variant, children, ...props }: CalloutNodeProps) => {
  const resolvedVariant = getCalloutVariant(variant);
  return (
    <PlateElement
      className={cn(
        "my-4 flex gap-3 rounded-md border bg-muted/40 px-4 py-3 text-sm",
        resolvedVariant === "warning" && "border-yellow-500/30 bg-yellow-500/10",
        resolvedVariant === "success" && "border-green-500/30 bg-green-500/10",
        resolvedVariant === "error" && "border-red-500/30 bg-red-500/10",
        className,
      )}
      {...props}
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
        {CALLOUT_ICON_BY_VARIANT[resolvedVariant]}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </PlateElement>
  );
};



const CalloutElement = CalloutNode;



export { CalloutElement, CalloutNode };


export type { CalloutNodeProps };
