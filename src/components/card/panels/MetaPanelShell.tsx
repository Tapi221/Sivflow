import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NUMERIC_TYPO, UI_TYPO } from "@/styles/tokens/typography";

type MetaPanelShellProps = {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  contentClassName?: string;
  style?: CSSProperties;
};

export const MetaPanelShell = ({
  children,
  className,
  bodyClassName,
  contentClassName,
  style,
}: MetaPanelShellProps) => {
  return (
    <aside
      className={cn(
        `meta-panel ds-editor-pane h-full w-[var(--ui-panel-width)] shrink-0 border-l text-sm ${UI_TYPO} ${NUMERIC_TYPO}`,
        className,
      )}
      style={
        {
          "--meta-row-px": "var(--ds-layout-card-row-px)",
          "--meta-font-size": "var(--ds-typography-font-size-sm)",
          "--meta-action-min-h": "var(--ds-layout-card-row-px)",
          "--meta-panel-shell-bg":
            "linear-gradient(180deg, color-mix(in srgb, var(--ds-semantic-color-background-sidebar) 82%, white 18%) 0%, color-mix(in srgb, var(--ds-semantic-color-background-sidebar) 94%, var(--ds-semantic-color-background-app) 6%) 100%)",
          "--meta-panel-surface":
            "color-mix(in srgb, var(--ds-semantic-color-background-app) 94%, var(--ds-semantic-color-action-primary-soft) 6%)",
          "--meta-panel-surface-muted":
            "color-mix(in srgb, var(--ds-semantic-color-background-sidebar-active) 58%, white 42%)",
          "--meta-panel-surface-elevated":
            "color-mix(in srgb, white 90%, var(--ds-semantic-color-action-primary-soft) 10%)",
          "--meta-panel-border":
            "color-mix(in srgb, var(--ds-semantic-color-border-default) 72%, var(--ds-semantic-color-action-primary) 28%)",
          "--meta-panel-border-strong":
            "color-mix(in srgb, var(--ds-semantic-color-border-strong) 58%, var(--ds-semantic-color-action-primary) 42%)",
          "--meta-panel-text-muted":
            "color-mix(in srgb, var(--ds-semantic-color-text-secondary) 86%, var(--ds-semantic-color-text-primary) 14%)",
          "--meta-panel-accent":
            "color-mix(in srgb, #0f766e 82%, var(--ds-semantic-color-action-primary) 18%)",
          "--meta-panel-accent-soft":
            "color-mix(in srgb, var(--ds-semantic-color-action-primary-soft) 64%, white 36%)",
          "--meta-panel-shadow-soft":
            "0 10px 24px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.88)",
          "--meta-panel-shadow-strong":
            "0 16px 30px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.92)",
          "--scrollbar-track": "transparent",
          "--scrollbar-thumb":
            "color-mix(in srgb, var(--meta-panel-border-strong) 72%, white 28%)",
          "--scrollbar-thumb-hover":
            "color-mix(in srgb, var(--meta-panel-accent) 20%, var(--meta-panel-border-strong) 80%)",
          "--scrollbar-thumb-active":
            "color-mix(in srgb, var(--meta-panel-accent) 36%, var(--meta-panel-border-strong) 64%)",

          background: "var(--meta-panel-shell-bg)",
          borderColor: "var(--meta-panel-border)",
          ...style,
        } as CSSProperties
      }
    >
      <div
        className={cn(
          "ds-editor-pane__body h-full overflow-y-auto p-2",
          bodyClassName,
        )}
      >
        <div
          className={cn("ds-editor-pane__content space-y-6", contentClassName)}
        >
          {children}
        </div>
      </div>
    </aside>
  );
};

type MetaPanelLeadSectionProps = {
  children: ReactNode;
  className?: string;
};

export const MetaPanelLeadSection = ({
  children,
  className,
}: MetaPanelLeadSectionProps) => {
  return (
    <section className={cn("ds-editor-pane__section", className)}>
      <div className="ds-editor-pane__lead mt-2 space-y-2 text-[length:var(--meta-font-size)]">
        {children}
      </div>
    </section>
  );
};
