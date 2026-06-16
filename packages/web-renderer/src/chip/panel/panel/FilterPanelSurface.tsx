import type { FilterPanelShellProps } from "@web-renderer/chip/panel/panel/FilterPanelShell";
import { FilterPanelShell } from "@web-renderer/chip/panel/panel/FilterPanelShell";
import { PanelSurface } from "@web-renderer/chip/panel/panel/PanelSurface";
import type { FloatingSurfaceVariantProps } from "@web-renderer/chip/ui/floating-surface";
import { cn } from "@web-renderer/lib/utils";

type FilterPanelSurfaceProps = FilterPanelShellProps &
  FloatingSurfaceVariantProps & {
    className?: string;
    shellClassName?: string;
  };

const FilterPanelSurface = ({ surface = "filter", className, shellClassName, ...props }: FilterPanelSurfaceProps) => {
  return (<PanelSurface surface={surface} className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)} > <FilterPanelShell {...props} className={cn("h-full min-h-0 bg-transparent", shellClassName)} /> </PanelSurface>);
};

export { FilterPanelSurface };
