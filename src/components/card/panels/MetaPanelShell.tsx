import { NUMERIC_TYPO, UI_TYPO } from "@shared/design-tokens/Typography";
import { cn } from "@web-renderer/lib/utils";
import type { CSSProperties, ReactNode } from "react";



type MetaPanelShellProps = {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  contentClassName?: string;
  style?: CSSProperties;
};
type MetaPanelLeadSectionProps = {
  children: ReactNode;
  className?: string;
};



const MetaPanelShell = ({ children, className, bodyClassName, contentClassName, style }: MetaPanelShellProps) => {
  return (<aside className={cn(`meta-panel ds-editor-pane h-full w-[var(--ui-panel-width)] shrink-0 border-l text-sm ${UI_TYPO} ${NUMERIC_TYPO}`, className)} style={{ "--meta-row-px": "var(--ds-layout-card-row-px)", "--meta-font-size": "var(--ds-typography-font-size-sm)", "--meta-action-min-h": "var(--ds-layout-card-row-px)", "--meta-panel-shell-bg": "var(--ds-semantic-color-background-sidebar)", "--meta-panel-surface": "color-mix(in srgb, var(--ds-semantic-color-background-app) 82%, var(--ds-semantic-color-background-sidebar) 18%)", "--meta-panel-surface-muted": "var(--ds-semantic-color-background-sidebar-active)", "--meta-panel-surface-elevated": "color-mix(in srgb, var(--ds-semantic-color-background-app) 78%, var(--ds-semantic-color-background-sidebar) 22%)", "--meta-panel-border": "color-mix(in srgb, var(--ds-semantic-color-border-default) 76%, #d8c7b7 24%)", "--meta-panel-border-strong": "color-mix(in srgb, var(--ds-semantic-color-border-strong) 58%, #d8c7b7 42%)", "--meta-panel-text-muted": "color-mix(in srgb, var(--sidebar-text-muted, var(--ds-semantic-color-text-secondary)) 90%, var(--ds-semantic-color-text-primary) 10%)", "--meta-panel-accent": "color-mix(in srgb, #0f766e 82%, var(--ds-semantic-color-action-primary) 18%)", "--meta-panel-accent-soft": "color-mix(in srgb, var(--meta-panel-accent) 12%, white 88%)", "--meta-panel-shadow-soft": "inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 1px 2px rgba(86, 72, 74, 0.12)", "--meta-panel-shadow-strong": "0 8px 24px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88)", background: "var(--meta-panel-shell-bg)", borderColor: "var(--meta-panel-border)", ...style } as CSSProperties} > <div className={cn("ds-editor-pane__body h-full overflow-y-auto p-2", bodyClassName)} > <div className={cn("ds-editor-pane__content space-y-6", contentClassName)} > {children} </div> </div> </aside>);
};
const MetaPanelLeadSection = ({ children, className }: MetaPanelLeadSectionProps) => {
  return (<section className={cn("ds-editor-pane__section", className)}> <div className="ds-editor-pane__lead mt-2 space-y-2 text-[length:var(--meta-font-size)]"> {children} </div> </section>);
};



export { MetaPanelShell, MetaPanelLeadSection };
