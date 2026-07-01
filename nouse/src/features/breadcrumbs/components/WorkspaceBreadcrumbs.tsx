import { useMemo } from "react";
import { ChevronRight } from "@web-renderer/chip/icons";
import { cn } from "@web-renderer/lib/utils";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useBreadcrumbExtraCrumbs } from "@/contexts/BreadcrumbContext";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/breadcrumbs.types";



type WorkspaceBreadcrumbsProps = {
  className?: string;
  isLeftPanelCollapsed?: boolean;
};
type NoDragStyle = CSSProperties & {
  WebkitAppRegion?: "no-drag";
};



const WORKSPACE_BREADCRUMBS_NO_DRAG_STYLE: NoDragStyle = {
  WebkitAppRegion: "no-drag",
};
const WORKSPACE_BREADCRUMBS_CLASS_NAME = "pointer-events-auto absolute top-3.5 z-30 flex h-6 max-w-[calc(100%-604px)] min-w-0 items-center overflow-hidden font-[var(--app-font-family-sidebar)] text-xs font-medium leading-none tracking-tight text-[#7d7b78]";
const WORKSPACE_BREADCRUMBS_EXPANDED_OFFSET_CLASS_NAME = "left-8";
const WORKSPACE_BREADCRUMBS_COLLAPSED_OFFSET_CLASS_NAME = "left-14";
const WORKSPACE_BREADCRUMBS_LIST_CLASS_NAME = "flex min-w-0 items-center gap-1 overflow-hidden";
const WORKSPACE_BREADCRUMB_ITEM_CLASS_NAME = "flex min-w-0 items-center gap-1";
const WORKSPACE_BREADCRUMB_BUTTON_CLASS_NAME = "min-w-0 truncate border-0 bg-transparent p-0 text-left font-inherit leading-none text-[#7d7b78] outline-none transition-colors duration-150 ease-out hover:text-[#6f6d6a] focus-visible:text-[#6f6d6a]";
const WORKSPACE_BREADCRUMB_LABEL_CLASS_NAME = "min-w-0 truncate p-0 leading-none text-[#7d7b78]";
const WORKSPACE_BREADCRUMB_SEPARATOR_CLASS_NAME = "h-3 w-3 shrink-0 text-[#7d7b78]";



const getBreadcrumbLabel = (crumb: BreadcrumbCrumb): string => {
  const label = crumb.label.trim();
  return label.length > 0 ? label : "無題";
};
const getBreadcrumbKey = (crumb: BreadcrumbCrumb, index: number): string => {
  return `${index}:${crumb.to ?? ""}:${crumb.folderId ?? ""}:${crumb.label}`;
};



const WorkspaceBreadcrumbs = ({ className, isLeftPanelCollapsed = false }: WorkspaceBreadcrumbsProps) => {
  const navigate = useNavigate();
  const extraCrumbs = useBreadcrumbExtraCrumbs();
  const crumbs = useMemo(
    () => extraCrumbs.filter((crumb) => getBreadcrumbLabel(crumb).length > 0),
    [extraCrumbs],
  );
  const offsetClassName = isLeftPanelCollapsed ? WORKSPACE_BREADCRUMBS_COLLAPSED_OFFSET_CLASS_NAME : WORKSPACE_BREADCRUMBS_EXPANDED_OFFSET_CLASS_NAME;

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="パンくず"
      className={cn(WORKSPACE_BREADCRUMBS_CLASS_NAME, offsetClassName, className)}
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
              {!isLast && <ChevronRight className={WORKSPACE_BREADCRUMB_SEPARATOR_CLASS_NAME} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};



export { WorkspaceBreadcrumbs };


export type { WorkspaceBreadcrumbsProps };
