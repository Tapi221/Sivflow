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
        "relative flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 flex-wrap items-center justify-between overflow-hidden bg-white",
        !isSegmented &&
          "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-[#e2e4e9] after:content-['']",
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
              "flex h-7 shrink-0 items-center gap-1",
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
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-[#8f929c] transition-colors hover:bg-[#f6f7f9] hover:text-[#25272d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={action.onClick}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {actions && actions.length > 0 ? (
        <div className="flex h-7 shrink-0 items-center justify-end gap-[6px]">
          {actions.map((action, index) => {
            const Icon = action.icon;
            const isLast = index === actions.length - 1;

            return (
              <button
                key={action.label}
                type="button"
                className={cn(
                  "flex h-7 items-center gap-[6px] rounded py-[3px] pl-2 text-[length:var(--ds-layout-font-size-meta)] font-medium leading-normal text-[#8f929c] transition-colors hover:bg-[#f6f7f9] hover:text-[#25272d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isLast ? "pr-0" : "pr-2",
                )}
                onClick={action.onClick}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{action.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
