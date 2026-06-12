import { CheckIcon as TickIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const C = ({ checked, className }) => {
  const isChecked = checked === true;

  return (
    <button
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs outline-none transition-shadow focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:data-[state=checked]:bg-primary",
        className,
      )}
      data-state={isChecked ? "checked" : "unchecked"}
      type="button"
    >
      <span className="flex items-center justify-center text-current transition-none">
        {isChecked && <TickIcon className="size-3.5" />}
      </span>
    </button>
  );
};

export const Checkbox = C;
