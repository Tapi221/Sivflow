import type { FloatingSurfaceVariantProps } from "@/chip/ui/floating-surface";
import type { FilterPanelShellProps } from "@/components/panel/FilterPanelShell";
import { FilterPanelShell } from "@/components/panel/FilterPanelShell";
import { PanelSurface } from "@/components/panel/PanelSurface";
import { cn } from "@/lib/utils";

type FilterPanelSurfaceProps = FilterPanelShellProps &
  FloatingSurfaceVariantProps & {
    className?: string;
    shellClassName?: string;
  };

const FilterPanelSurface = ({ surface = "filter", className, shellClassName, ...props }: FilterPanelSurfaceProps) => {
  return (<PanelSurface surface={surface} className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)} > <FilterPanelShell {...props} className={cn("h-full min-h-0 bg-transparent", shellClassName)} /> </PanelSurface>);
};

export { FilterPanelSurface };
