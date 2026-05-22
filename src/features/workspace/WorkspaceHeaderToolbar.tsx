import { motion, type Transition } from "framer-motion";
import type { ComponentType, SVGProps } from "react";

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

type WorkspaceHeaderToolbarVariant = "underline" | "segmented";

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

const toolbarIconClassName =
  "h-[17px] w-[17px] shrink-0 text-current transition-transform duration-200 ease-out group-hover/action:scale-[1.06] group-focus-visible/action:scale-[1.06] motion-reduce:transition-none";

const toolbarTooltipClassName =
  "pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-full border border-[#d1d1d6]/70 bg-white/95 px-2.5 py-1 text-[11px] font-medium leading-none tracking-[-0.01em] text-[#3c3c43]/72 opacity-0 shadow-[0_8px_18px_rgba(60,60,67,0.12)] backdrop-blur-xl transition-all duration-150 ease-out group-hover/action:translate-y-0 group-hover/action:opacity-100 group-focus-visible/action:translate-y-0 group-focus-visible/action:opacity-100 motion-reduce:transition-none";

const resolveSegmentedTabColumnWidth = (
  tabs: readonly WorkspaceHeaderToolbarItem[],
) => {
  const longestLabelLength = Math.max(
    0,
    ...tabs.map((tab) => tab.label.length),
  );

  return `calc(${longestLabelLength}ch + 2.35rem)`;
};

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

  const renderSegmentedTabs = (
    segmentedTabs: readonly WorkspaceHeaderToolbarItem[],
    indicatorId: string,
  ) => {
    return (
      <div
        className="relative inline-grid h-9 w-max items-center gap-0 rounded-full border border-[#d1d1d6]/70 bg-[#f2f2f7]/85 p-1 shadow-[inset_0_0_0_0.5px_rgba(60,60,67,0.10)] backdrop-blur-xl"
        style={{
          gridTemplateColumns: `repeat(${segmentedTabs.length}, ${resolveSegmentedTabColumnWidth(
            segmentedTabs,
          )})`,
        }}
      >
        {segmentedTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeValue === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              className={cn(
                "relative z-10 flex h-7 w-full min-w-0 items-center justify-center gap-1.5 rounded-full px-2.5",
                "appearance-none select-none",
                "text-[12px] font-semibold leading-none tracking-[-0.01em]",
                "outline-none ring-0 transition-[color,transform] duration-200 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]/25",
                isActive
                  ? "text-[#007aff]"
                  : "text-[#3c3c43]/60 hover:text-[#007aff] active:scale-[0.98]",
              )}
              aria-pressed={isActive}
              onClick={tab.onClick}
            >
              {isActive && (
                <motion.span
                  layoutId={indicatorId}
                  className="absolute inset-0 -z-10 rounded-full border border-white/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_6px_18px_rgba(0,0,0,0.10)]"
                  transition={WORKSPACE_TAB_MOTION_TRANSITION}
                />
              )}

              <Icon
                className={cn(
                  "block h-[17px] w-[17px] shrink-0 text-current transition-[opacity,transform] duration-200 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                  isActive ? "opacity-100" : "opacity-70",
                )}
              />

              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "relative flex h-[var(--ds-semantic-breadcrumb-height)] min-h-11 w-full shrink-0 flex-wrap items-center justify-between overflow-visible bg-white/85 px-2 backdrop-blur-xl",
        !isSegmented &&
          "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-[rgba(60,60,67,0.18)] after:content-['']",
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

        {hasLeadingActions ? (
          <div
            className={cn(
              "relative z-10 flex h-10 shrink-0 items-center gap-1 rounded-full bg-[#f2f2f7]/80 p-1 shadow-[inset_0_0_0_0.5px_rgba(60,60,67,0.12)] backdrop-blur-xl",
              hasLeadingContentBeforeActions ? "ml-2" : "ml-0",
            )}
          >
            {leadingActions?.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.ariaLabel ?? action.label}
                  type="button"
                  aria-label={action.ariaLabel ?? action.label}
                  className="group/action relative inline-flex h-8 w-8 items-center justify-center rounded-full text-[#3c3c43]/60 transition-[background-color,color,box-shadow] duration-150 ease-out hover:bg-white/95 hover:text-[#007aff] hover:shadow-[0_1px_4px_rgba(0,0,0,0.1)] active:bg-white active:text-[#0066d6] motion-reduce:transition-none focus-visible:bg-white focus-visible:text-[#007aff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]/25"
                  onClick={action.onClick}
                >
                  <Icon className={toolbarIconClassName} />
                  <span className={toolbarTooltipClassName}>
                    {action.ariaLabel ?? action.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {actions && actions.length > 0 ? (
        <div className="relative z-10 flex h-10 shrink-0 items-center justify-end gap-1 rounded-full bg-[#f2f2f7]/80 p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_0_0_0.5px_rgba(60,60,67,0.12)] backdrop-blur-xl">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.label}
                type="button"
                aria-label={action.ariaLabel ?? action.label}
                className="group/action relative flex h-8 w-8 items-center justify-center rounded-full text-[#3c3c43]/65 transition-[background-color,color,box-shadow] duration-150 ease-out hover:bg-white/95 hover:text-[#007aff] hover:shadow-[0_1px_4px_rgba(0,0,0,0.1)] active:bg-white active:text-[#0066d6] motion-reduce:transition-none focus-visible:bg-white focus-visible:text-[#007aff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]/25"
                onClick={action.onClick}
              >
                <Icon className={toolbarIconClassName} />
                <span className={toolbarTooltipClassName}>{action.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
