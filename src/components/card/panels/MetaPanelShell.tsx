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
          "--meta-panel-shell-bg": "#f4f0e9",
          "--meta-panel-surface": "#fbfaf7",
          "--meta-panel-surface-muted": "#efe7dc",
          "--meta-panel-surface-elevated": "#f8f5f0",
          "--meta-panel-border": "#d8cdbf",
          "--meta-panel-border-strong": "#cbbcab",
          "--meta-panel-text-muted": "#746f69",
          "--meta-panel-accent": "#667188",
          "--meta-panel-accent-soft": "#eef1f4",
          "--meta-panel-shadow-soft":
            "0 1px 2px rgba(84, 67, 44, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.92)",
          "--meta-panel-shadow-strong":
            "0 2px 6px rgba(84, 67, 44, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.94)",
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
