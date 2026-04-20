import { cn } from "@/lib/utils";

type OverlayToolbarDividerProps = {
  className?: string;
};

export const OverlayToolbarDivider = ({
  className,
}: OverlayToolbarDividerProps) => {
  return (
    <span
      className={cn("h-4 w-px shrink-0 bg-[rgba(218,207,197,0.82)]", className)}
      aria-hidden="true"
    />
  );
};
