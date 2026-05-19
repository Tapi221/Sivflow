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

type WorkspaceHeaderToolbarProps = {
  activeValue: string;
  tabs: readonly WorkspaceHeaderToolbarItem[];
  secondaryTabs?: readonly WorkspaceHeaderToolbarItem[];
  leadingActions?: readonly WorkspaceHeaderToolbarAction[];
  actions?: readonly WorkspaceHeaderToolbarAction[];
};

export const WorkspaceHeaderToolbar = ({
  activeValue,
  tabs,
  secondaryTabs,
  leadingActions,
  actions,
}: WorkspaceHeaderToolbarProps) => {
  const hasTabs = tabs.length > 0;
  const hasSecondaryTabs = Boolean(secondaryTabs && secondaryTabs.length > 0);
  const hasLeadingActions = Boolean(
    leadingActions && leadingActions.length > 0,
  );
  const hasLeadingContentBeforeActions = hasTabs || hasSecondaryTabs;

  return (
    <div className="relative flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 flex-wrap items-center justify-between overflow-hidden bg-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-[#e2e4e9] after:content-['']">
      <div
        className={cn(
          "flex min-w-0 items-center",
          hasLeadingContentBeforeActions ? "gap-3" : "gap-0",
        )}
      >
        {hasTabs ? (
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
        ) : null}

        {hasSecondaryTabs ? (
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
