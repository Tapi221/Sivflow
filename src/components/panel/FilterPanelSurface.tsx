import type { FloatingSurfaceVariantProps } from "@/components/ui/floating-surface";

import {
  FilterPanelShell,
  type FilterPanelShellProps,
} from "./FilterPanelShell";
import { PanelSurface } from "./PanelSurface";

import { cn } from "@/lib/utils";

type FilterPanelSurfaceProps = FilterPanelShellProps &
  FloatingSurfaceVariantProps & {
    className?: string;
    shellClassName?: string;
  };

export const FilterPanelSurface = ({
  surface = "filter",
  className,
  shellClassName,
  ...props
}: FilterPanelSurfaceProps) => {
  return (
    <PanelSurface
      surface={surface}
      className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}
    >
      <FilterPanelShell
        {...props}
        className={cn("h-full min-h-0 bg-transparent", shellClassName)}
      />
    </PanelSurface>
  );
};
