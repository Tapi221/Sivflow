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

const WORKSPACE_BREADCRUMBS_CLASS_NAME = "pointer-events-auto absolute left-8 top-[15px] z-30 flex h-7 max-w-[calc(100%-604px)] min-w-0 items-center overflow-hidden font-[var(--app-font-family-sidebar)] text-[14px] font-medium leading-none tracking-[-0.018em] text-[#7d7b78]";
const WORKSPACE_BREADCRUMBS_LIST_CLASS_NAME = "flex min-w-0 items-center gap-[5px] overflow-hidden";
const WORKSPACE_BREADCRUMB_ITEM_CLASS_NAME = "flex min-w-0 items-center gap-[5px]";
const WORKSPACE_BREADCRUMB_BUTTON_CLASS_NAME = "min-w-0 truncate border-0 bg-transparent p-0 text-left font-inherit leading-none text-[#7d7b78] outline-none transition-colors duration-150 ease-out hover:text-[#6f6d6a] focus-visible:text-[#6f6d6a]";
const WORKSPACE_BREADCRUMB_LABEL_CLASS_NAME = "min-w-0 truncate p-0 leading-none text-[#7d7b78]";
const WORKSPACE_BREADCRUMB_SEPARATOR_CLASS_NAME = "h-3.5 w-3.5 shrink-0 text-[#7d7b78]";

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
      className={cn(WORKSPACE_BREADCRUMBS_CLASS_NAME, className)}
      style={WORKSPACE_BREADCRUMBS_NO_DRAG_STYLE}
    >
      <ol className={WORKSPACE_BREADCRUMBS_LIST_CLASS_NAME}>
        {crumbs.map((crumb, index) => {
          const label = getBreadcrumbLabel(crumb);
          const isLast = index === crumbs.length - 1;
          const isClickable = !isLast && crumb.to !== undefined;

          return (
            <li
              key={getBreadcrumbKey(crumb, index)}
              className={WORKSPACE_BREADCRUMB_ITEM_CLASS_NAME}
            >
              {isClickable ? (
                <button
                  type="button"
                  className={WORKSPACE_BREADCRUMB_BUTTON_CLASS_NAME}
                  title={label}
                  onClick={() => {
                    navigate(crumb.to ?? "/schedule");
                  }}
                >
                  {label}
                </button>
              ) : (
                <span
                  className={WORKSPACE_BREADCRUMB_LABEL_CLASS_NAME}
                  title={label}
                  aria-current={isLast ? "page" : undefined}
                >
                  {label}
                </span>
              )}

              {!isLast ? (
                <ChevronRight className={WORKSPACE_BREADCRUMB_SEPARATOR_CLASS_NAME} />
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
