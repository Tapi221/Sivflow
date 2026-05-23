import { motion, type Transition } from "framer-motion";
import type { ComponentType, SVGProps } from "react";

import { HoverCircleTooltip } from "@/components/toolchip/HoverCircleTooltip";
import { HoverTooltip } from "@/components/toolchip/HoverTooltip";
import { cn } from "@/lib/utils";

export type WorkspaceHeaderToolbarIconProps = SVGProps<SVGSVGElement> & {
  className?: string;
};

type WorkspaceHeaderToolbarItem = {
  value: string;
  label: string;
  icon: ComponentType<WorkspaceHeaderToolbarIconProps>;
  onClick: () => void;
};

type WorkspaceHeaderToolbarAction = {
  label: string;
  icon: ComponentType<WorkspaceHeaderToolbarIconProps>;
  onClick?: () => void;
  ariaLabel?: string;
};

type WorkspaceHeaderToolbarVariant = "underline" | "segmented" | "floating";

type WorkspaceHeaderToolbarProps = {
  activeValue: string;
  tabs: readonly WorkspaceHeaderToolbarItem[];
  secondaryTabs?: readonly WorkspaceHeaderToolbarItem[];
  leadingActions?: readonly WorkspaceHeaderToolbarAction[];
  actions?: readonly WorkspaceHeaderToolbarAction[];
  variant?: WorkspaceHeaderToolbarVariant;
};

const WORKSPACE_TAB_INDICATOR_ID = "workspace-header-toolbar-tab-indicator";
const WORKSPACE_TAB_MOTION_TRANSITION: Transition = {
  type: "tween",
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
};

const segmentedTabTooltipClassName =
  "rounded-lg border border-[#eeeeee] bg-white px-2.5 py-[5px] text-[12px] font-medium text-[#8c8c8c] shadow-[0_8px_18px_rgba(0,0,0,0.08)]";
const segmentedTabTooltipArrowClassName =
  "border-b border-r border-[#eeeeee] bg-white";

const segmentedActionGroupClassName =
  "relative z-10 inline-grid h-8 w-max grid-flow-col items-center gap-1 rounded-xl bg-[#f7f7f7] p-0.5";

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

const floatingActionButtonClassName = cn(
  "group/action relative flex h-8 w-8 items-center justify-center rounded-full p-0",
  "appearance-none select-none text-[#a7a7a7]",
  "outline-none ring-0 transition-[background-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
  "hover:bg-white/70 hover:text-[#767676] hover:shadow-[0_3px_10px_rgba(0,0,0,0.08)]",
  "active:scale-95 active:bg-white/85 active:text-[#606060]",
  "focus:outline-none focus:ring-0 focus-visible:bg-white/80 focus-visible:text-[#606060] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/20",
);

const floatingActionIconClassName =
  "block h-4 w-4 shrink-0 text-current transition-colors duration-200 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none";

export const WorkspaceHeaderToolbar = ({
  activeValue,
  tabs,
  secondaryTabs,
  leadingActions,
  actions,
  variant = "underline",
}: WorkspaceHeaderToolbarProps) => {
  const hasTabs = tabs.length > 0;
  const hasSecondaryTabs = Boolean(secondaryTabs && secondaryTabs.length > 0);
  const hasLeadingActions = Boolean(
    leadingActions && leadingActions.length > 0,
  );
  const hasLeadingContentBeforeActions = hasTabs || hasSecondaryTabs;
  const isSegmented = variant === "segmented";
  const isFloating = variant === "floating";

  const renderSegmentedTabs = (
    segmentedTabs: readonly WorkspaceHeaderToolbarItem[],
    indicatorId: string,
  ) => {
    return (
      <div className="relative inline-grid h-8 w-max grid-flow-col items-center gap-1 rounded-xl bg-[#f7f7f7] p-0.5">
        {segmentedTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeValue === tab.value;

          return (
            <HoverTooltip
              key={tab.value}
              label={tab.label}
              side="top"
              offset={6}
              tooltipClassName={segmentedTabTooltipClassName}
              arrowClassName={segmentedTabTooltipArrowClassName}
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
                    className="absolute inset-0 -z-10 rounded-lg border border-[#eeeeee] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
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
    toolbarActions: readonly WorkspaceHeaderToolbarAction[],
    className?: string,
  ) => {
    return (
      <div className={cn(segmentedActionGroupClassName, className)}>
        {toolbarActions.map((action) => {
          const Icon = action.icon;
          const label = action.ariaLabel ?? action.label;

          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              className={segmentedActionButtonClassName}
              onClick={action.onClick}
            >
              <Icon aria-hidden="true" className={segmentedActionIconClassName} />
              <HoverCircleTooltip label={label} />
            </button>
          );
        })}
      </div>
    );
  };

  const renderFloatingActions = (
    toolbarActions: readonly WorkspaceHeaderToolbarAction[],
    className?: string,
  ) => {
    return (
      <div className={cn("pointer-events-auto flex items-center gap-2", className)}>
        {toolbarActions.map((action) => {
          const Icon = action.icon;
          const label = action.ariaLabel ?? action.label;

          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              className={floatingActionButtonClassName}
              onClick={action.onClick}
            >
              <Icon aria-hidden="true" className={floatingActionIconClassName} />
              <HoverCircleTooltip label={label} />
            </button>
          );
        })}
      </div>
    );
  };

  if (isFloating) {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-14 items-start justify-between px-4 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          {hasLeadingActions
            ? renderFloatingActions(leadingActions ?? [])
            : null}
        </div>

        {actions && actions.length > 0
          ? renderFloatingActions(actions, "justify-end")
          : null}
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
        {hasTabs ? (
          isSegmented ? (
            renderSegmentedTabs(tabs, `${WORKSPACE_TAB_INDICATOR_ID}-primary`)
          ) : (
            <div className="flex h-7 shrink-0 items-start gap-[6px]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeValue === tab.value;

                return (
                  <div key={tab.value} className="flex flex-col items-start pb-2">
                    <button
                      type="button"
                      className={cn(
                        "flex h-7 items-center gap-[6px] rounded py-[3px] pl-0 pr-2 text-[length:var(--ds-layout-font-size-meta)] font-medium leading-normal transition-colors hover:bg-[#f6f7f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive ? "text-[#25272d]" : "text-[#8f929c]",
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
          )
        ) : null}

        {hasSecondaryTabs ? (
          isSegmented ? (
            renderSegmentedTabs(
              secondaryTabs ?? [],
              `${WORKSPACE_TAB_INDICATOR_ID}-secondary`,
            )
          ) : (
            <div className="ml-3 flex h-7 shrink-0 items-start gap-1">
              {secondaryTabs?.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeValue === tab.value;

                return (
                  <div key={tab.value} className="flex flex-col items-start pb-2">
                    <button
                      type="button"
                      className={cn(
                        "flex h-7 items-center gap-[6px] rounded px-2 text-[length:var(--ds-layout-font-size-meta)] font-medium leading-normal transition-colors hover:bg-[#f6f7f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive ? "text-[#25272d]" : "text-[#8f929c]",
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
          )
        ) : null}

        {hasLeadingActions
          ? renderSegmentedActions(
              leadingActions ?? [],
              hasLeadingContentBeforeActions ? "ml-2" : "ml-0",
            )
          : null}
      </div>

      {actions && actions.length > 0 ? renderSegmentedActions(actions) : null}
    </div>
  );
};
