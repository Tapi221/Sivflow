import { type CSSProperties, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBreadcrumbExtraCrumbs } from "@/contexts/BreadcrumbContext";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/breadcrumbs.types";
import { cn } from "@/lib/utils";
import { ChevronRight } from "@/ui/icons";

type WorkspaceBreadcrumbsProps = {
  className?: string;
};

type NoDragStyle = CSSProperties & {
  WebkitAppRegion?: "no-drag";
};

const WORKSPACE_BREADCRUMBS_NO_DRAG_STYLE: NoDragStyle = {
  WebkitAppRegion: "no-drag",
};

const getBreadcrumbLabel = (crumb: BreadcrumbCrumb): string => {
  const label = crumb.label.trim();
  return label.length > 0 ? label : "無題";
};

const getBreadcrumbKey = (crumb: BreadcrumbCrumb, index: number): string => {
  return `${index}:${crumb.to ?? ""}:${crumb.folderId ?? ""}:${crumb.label}`;
};

const WorkspaceBreadcrumbs = ({ className }: WorkspaceBreadcrumbsProps) => {
  const navigate = useNavigate();
  const extraCrumbs = useBreadcrumbExtraCrumbs();
  const crumbs = useMemo(
    () => extraCrumbs.filter((crumb) => getBreadcrumbLabel(crumb).length > 0),
    [extraCrumbs],
  );

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="パンくず"
      className={cn(
        "pointer-events-auto absolute left-5 top-3 z-30 flex h-8 max-w-[calc(100%-560px)] min-w-0 items-center overflow-hidden text-[13px] font-semibold leading-none tracking-[-0.018em] text-[#2f343b]",
        className,
      )}
      style={WORKSPACE_BREADCRUMBS_NO_DRAG_STYLE}
    >
      <ol className="flex min-w-0 items-center gap-1 overflow-hidden">
        {crumbs.map((crumb, index) => {
          const label = getBreadcrumbLabel(crumb);
          const isLast = index === crumbs.length - 1;
          const isClickable = !isLast && crumb.to !== undefined;

          return (
            <li
              key={getBreadcrumbKey(crumb, index)}
              className="flex min-w-0 items-center gap-1"
            >
              {isClickable ? (
                <button
                  type="button"
                  className="min-w-0 truncate rounded-[6px] px-1.5 py-1 text-left text-[#4f5359] outline-none transition-colors hover:bg-[#eeeeee] hover:text-[#2f343b] focus-visible:bg-[#eeeeee] focus-visible:text-[#2f343b]"
                  title={label}
                  onClick={() => {
                    navigate(crumb.to ?? "/schedule");
                  }}
                >
                  {label}
                </button>
              ) : (
                <span
                  className={cn(
                    "min-w-0 truncate px-1.5 py-1",
                    isLast ? "text-[#111111]" : "text-[#4f5359]",
                  )}
                  title={label}
                  aria-current={isLast ? "page" : undefined}
                >
                  {label}
                </span>
              )}

              {!isLast ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#9a9a9a]" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export { WorkspaceBreadcrumbs };
export type { WorkspaceBreadcrumbsProps };
