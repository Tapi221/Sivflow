import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--surface-border)] bg-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#cfcfcf] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-blue-700 data-[state=checked]:bg-blue-700 data-[state=checked]:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_-1px_0_rgba(11,56,96,0.35)_inset,0_1px_2px_rgba(11,56,96,0.28)] data-[state=unchecked]:bg-white data-[state=unchecked]:shadow-[var(--surface-shadow-concave)]",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-2 w-2 rounded-full bg-white shadow-[0_1px_1px_rgba(15,23,42,0.14)] ring-0 transition-opacity data-[state=checked]:opacity-100 data-[state=unchecked]:opacity-0",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };



