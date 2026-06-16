import { Fragment } from "react";
import { HoverTooltip } from "@web-renderer/chip/panel/toolchip/HoverTooltip";
import { cn } from "@web-renderer/lib/utils";
import type { Transition } from "framer-motion";
import { motion } from "framer-motion";
import type { ComponentType, ReactNode, SVGProps } from "react";



type LibraryHeaderToolbarIconProps = SVGProps<SVGSVGElement> & { className?: string;
};
type LibraryHeaderToolbarActionRenderProps = {
  className: string;
  iconClassName: string;
  label: string;
};
type LibraryHeaderToolbarItem = {
  value: string;
  label: string;
  icon: ComponentType<LibraryHeaderToolbarIconProps>;
  onClick: () => void;
};
type LibraryHeaderToolbarAction = {
  label: string;
  icon?: ComponentType<LibraryHeaderToolbarIconProps>;
  onClick?: () => void;
  ariaLabel?: string;
  render?: (props: LibraryHeaderToolbarActionRenderProps) => ReactNode;
};
type LibraryHeaderToolbarVariant = "underline" | "segmented" | "floating";
type LibraryHeaderToolbarProps = {
  activeValue: string;
  tabs: readonly LibraryHeaderToolbarItem[];
  secondaryTabs?: readonly LibraryHeaderToolbarItem[];
  leadingActions?: readonly LibraryHeaderToolbarAction[];
  actions?: readonly LibraryHeaderToolbarAction[];
  variant?: LibraryHeaderToolbarVariant;
};



const WORKSPACE_TAB_INDICATOR_ID = "workspace-header-toolbar-tab-indicator";
const WORKSPACE_TAB_MOTION_TRANSITION: Transition = {
  type: "tween",
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
};
const segmentedActionGroupClassName =
  "relative z-10 inline-grid h-8 w-max grid-flow-col items-center gap-1 rounded-xl bg-zinc-100 p-0.5";
const segmentedActionButtonClassName = cn(
  "group/action relative z-10 flex h-7 w-11 min-w-0 items-center justify-center rounded-lg p-0",
  "appearance-none select-none text-[#b3b3b3]",
  "outline-none ring-0 transition-[background-color,color,box-shadow] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
  "hover:bg-white hover:text-[#8c8c8c] hover:shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
  "active:bg-white active:text-[#8c8c8c]",
  "focus:outline-none focus:ring-0 focus-visible:bg-white focus-visible:text-[#8c8c8c] focus-visible:outline-none",
);
const segmentedActionIconClassName =
  "block h-4 w-4 shrink-0 text-current transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none";



const LibraryHeaderToolbar = ({ activeValue, tabs, secondaryTabs, leadingActions, actions, variant = "underline" }: LibraryHeaderToolbarProps) => {
  const hasTabs = tabs.length > 0;
  const hasSecondaryTabs = Boolean(secondaryTabs && secondaryTabs.length > 0);
  const hasLeadingActions = Boolean(
    leadingActions && leadingActions.length > 0,
  );
  const hasTrailingActions = Boolean(actions && actions.length > 0);
  const hasLeadingContentBeforeActions = hasTabs || hasSecondaryTabs;
  const isSegmented = variant === "segmented";
  const isFloating = variant === "floating";

  const renderSegmentedTabs = (
    segmentedTabs: readonly LibraryHeaderToolbarItem[],
    indicatorId: string,
  ) => {
    return (
      <div className="relative inline-grid h-8 w-max grid-flow-col items-center gap-1 rounded-xl bg-zinc-100 p-0.5">
        {segmentedTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeValue === tab.value;

          return (
            <HoverTooltip
              key={tab.value}
              label={tab.label}
              side="top"
              offset={6}
              preset="segmented"
            >
              <button
                type="button"
                className={cn(
                  "relative z-10 flex h-7 w-11 min-w-0 items-center justify-center rounded-lg p-0",
                  "appearance-none select-none",
                  "outline-none ring-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                  "focus:outline-none focus:ring-0 focus-visible:outline-none",
                  isActive
                    ? "text-[#8c8c8c]"
                    : "text-[#b3b3b3] hover:text-[#8c8c8c]",
                )}
                aria-label={tab.label}
                aria-pressed={isActive}
                onClick={tab.onClick}
              >
                {isActive && (
                  <motion.span
                    layoutId={indicatorId}
                    className="absolute inset-0 -z-10 rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                    transition={WORKSPACE_TAB_MOTION_TRANSITION}
                  />
                )}

                <Icon
                  aria-hidden="true"
                  className={cn(
                    "block h-4 w-4 shrink-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                    isActive ? "text-[#8c8c8c]" : "text-[#b7b7b7]",
                  )}
                />
              </button>
            </HoverTooltip>
          );
        })}
      </div>
    );
  };

  const renderSegmentedActions = (
    toolbarActions: readonly LibraryHeaderToolbarAction[],
    className?: string,
  ) => {
    return (
      <div className={cn(segmentedActionGroupClassName, className)}>
        {toolbarActions.map((action) => {
          const label = action.ariaLabel ?? action.label;

          if (action.render) {
            return (
              <Fragment key={label}>
                {action.render({
                  className: segmentedActionButtonClassName,
                  iconClassName: segmentedActionIconClassName,
                  label,
                })}
              </Fragment>
            );
          }

          const Icon = action.icon;
          if (!Icon) return null;

          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              className={segmentedActionButtonClassName}
              onClick={action.onClick}
            >
              <Icon aria-hidden="true" className={segmentedActionIconClassName} />
            </button>
          );
        })}
      </div>
    );
  };
  const renderUnderlineTabs = (toolbarTabs: readonly LibraryHeaderToolbarItem[], className = "flex h-7 shrink-0 items-start gap-1.5") => {
    return (
      <div className={className}>
        {toolbarTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeValue === tab.value;
          return (
            <div key={tab.value} className="flex flex-col items-start pb-2">
              <button
                type="button"
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded py-0.5 pl-0 pr-2 text-[length:var(--ds-layout-font-size-meta)] font-medium leading-normal transition-colors hover:bg-[#f6f7f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "text-[#25272d]" : "text-slate-500",
                )}
                aria-pressed={isActive}
                onClick={tab.onClick}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span
                  className={cn(
                    "flex h-7 items-center whitespace-nowrap",
                    isActive && "border-b-2 border-[#74798b]",
                  )}
                >
                  {tab.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    );
  };
  const primaryTabsContent = isSegmented ? renderSegmentedTabs(tabs, `${WORKSPACE_TAB_INDICATOR_ID}-primary`) : renderUnderlineTabs(tabs);
  const secondaryTabsContent = isSegmented
    ? renderSegmentedTabs(secondaryTabs ?? [], `${WORKSPACE_TAB_INDICATOR_ID}-secondary`)
    : renderUnderlineTabs(secondaryTabs ?? [], "ml-3 flex h-7 shrink-0 items-start gap-1");

  if (isFloating) {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-14 items-start justify-between px-4 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          {hasLeadingActions && renderSegmentedActions(leadingActions ?? [], "pointer-events-auto")}
        </div>

        {hasTrailingActions && renderSegmentedActions(actions ?? [], "pointer-events-auto justify-end")}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 flex-wrap items-center justify-between overflow-visible",
        isSegmented
          ? "bg-white pr-[var(--workspace-content-gutter)]"
          : "min-h-11 bg-white/85 px-2 backdrop-blur-xl after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-[rgba(60,60,67,0.18)] after:content-['']",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center",
          hasLeadingContentBeforeActions ? "gap-3" : "gap-0",
        )}
      >
        {hasTabs && primaryTabsContent}
        {hasSecondaryTabs && secondaryTabsContent}
        {hasLeadingActions && renderSegmentedActions(
          leadingActions ?? [],
          hasLeadingContentBeforeActions ? "ml-2" : "ml-0",
        )}
      </div>

      {hasTrailingActions && renderSegmentedActions(actions ?? [])}
    </div>
  );
};



export { LibraryHeaderToolbar };


export type { LibraryHeaderToolbarIconProps, LibraryHeaderToolbarActionRenderProps };
