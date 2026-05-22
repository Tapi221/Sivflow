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

const resolveSegmentedTabColumnWidth = (
  tabs: readonly WorkspaceHeaderToolbarItem[],
) => {
  const longestLabelLength = Math.max(
    0,
    ...tabs.map((tab) => tab.label.length),
  );

  return `calc(${longestLabelLength}ch + 1.5rem)`;
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
        className="relative inline-grid h-8 w-max items-center gap-1 rounded-xl bg-[#f6f8fb] p-0.5"
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
                "relative z-10 flex h-7 w-full min-w-0 items-center justify-center gap-1.5 rounded-lg px-2",
                "appearance-none select-none",
                "text-[12px] font-medium leading-none",
                "outline-none ring-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                "focus:outline-none focus:ring-0 focus-visible:outline-none",
                isActive
                  ? "text-[#193a5c]"
                  : "text-[#8f929c] hover:text-[#193a5c]",
              )}
              aria-pressed={isActive}
              onClick={tab.onClick}
            >
              {isActive && (
                <motion.span
                  layoutId={indicatorId}
                  className="absolute inset-0 -z-10 rounded-lg border border-[#e4eaf1] bg-white"
                  transition={WORKSPACE_TAB_MOTION_TRANSITION}
                />
              )}

              <Icon
                className={cn(
                  "block h-4 w-4 shrink-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                  isActive ? "text-[#193a5c]" : "text-[#9aa3b1]",
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
        "relative flex h-[var(--ds-semantic-breadcrumb-height)] min-h-11 w-full shrink-0 flex-wrap items-center justify-between overflow-hidden bg-white/85 px-2 backdrop-blur-xl",
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
              "flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#f2f2f7]/80 p-1 shadow-[inset_0_0_0_0.5px_rgba(60,60,67,0.12)] backdrop-blur-xl",
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
                  title={action.ariaLabel ?? action.label}
                  className="group/leading inline-flex h-7 w-7 items-center justify-center rounded-full text-[#3c3c43]/60 transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:bg-white/90 hover:text-[#007aff] hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)] active:scale-[0.96] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]/25"
                  onClick={action.onClick}
                >
                  <Icon className="h-[17px] w-[17px] shrink-0 transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] group-hover/leading:-translate-y-px group-hover/leading:scale-110 group-focus-visible/leading:scale-110 motion-reduce:transition-none" />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {actions && actions.length > 0 ? (
        <div className="flex h-9 shrink-0 items-center justify-end gap-1 rounded-full bg-[#f2f2f7]/80 p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_0_0_0.5px_rgba(60,60,67,0.12)] backdrop-blur-xl">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.label}
                type="button"
                aria-label={action.ariaLabel ?? action.label}
                title={action.ariaLabel ?? action.label}
                className="group/action flex h-7 max-w-7 items-center justify-start overflow-hidden rounded-full px-[5.5px] text-[13px] font-medium leading-none tracking-[-0.01em] text-[#3c3c43]/65 transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:max-w-[108px] hover:bg-white/90 hover:text-[#007aff] hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)] active:scale-[0.97] motion-reduce:transition-none focus-visible:max-w-[108px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]/25"
                onClick={action.onClick}
              >
                <Icon className="h-[17px] w-[17px] shrink-0 transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] group-hover/action:-translate-y-px group-hover/action:scale-110 group-focus-visible/action:scale-110 motion-reduce:transition-none" />
                <span className="ml-0 max-w-0 translate-x-1 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] group-hover/action:ml-1.5 group-hover/action:max-w-[72px] group-hover/action:translate-x-0 group-hover/action:opacity-100 group-focus-visible/action:ml-1.5 group-focus-visible/action:max-w-[72px] group-focus-visible/action:translate-x-0 group-focus-visible/action:opacity-100 motion-reduce:transition-none">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
