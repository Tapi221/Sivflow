import type * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const CHECKBOX_CLASS_NAME = "peer size-4 shrink-0 rounded border border-input shadow-xs outline-none transition-shadow focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-neutral-900 data-[state=checked]:bg-neutral-900 data-[state=checked]:text-neutral-50 dark:bg-input/30 dark:data-[state=checked]:border-neutral-100 dark:data-[state=checked]:bg-neutral-100 dark:data-[state=checked]:text-neutral-900 dark:aria-invalid:ring-destructive/40";
const CHECKBOX_INDICATOR_CLASS_NAME = "grid place-content-center text-current transition-none";

const Checkbox = ({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) => {
  return (
    <CheckboxPrimitive.Root
      className={cn(CHECKBOX_CLASS_NAME, className)}
      data-slot="checkbox"
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={CHECKBOX_INDICATOR_CLASS_NAME}
        data-slot="checkbox-indicator"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
};

export { Checkbox };
