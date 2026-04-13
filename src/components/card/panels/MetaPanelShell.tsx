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
<<<<<<< HEAD
        `meta-panel ds-editor-pane h-full w-80 shrink-0 font-serif text-sm ${UI_TYPO} ${NUMERIC_TYPO}`,
=======
        `meta-panel ds-editor-pane h-full w-80 shrink-0 border-l font-serif text-sm ${UI_TYPO} ${NUMERIC_TYPO}`,
>>>>>>> 32820bee7da7fee740ea5702917206b96c2986eb
        className,
      )}
      style={
        {
          "--meta-row-px": "var(--app-row-px)",
          "--meta-font-size": "var(--ui-font-size-sm)",
          "--meta-action-min-h": "var(--meta-row-px)",
          backgroundColor: "var(--ds-semantic-color-background-sidebar)",
          ...style,
        } as CSSProperties
      }
    >
      <div
<<<<<<< HEAD
        className={cn("ds-editor-pane__body h-full overflow-y-auto p-2", bodyClassName)}
=======
        className={cn(
          "ds-editor-pane__body h-full overflow-y-auto p-2",
          bodyClassName,
        )}
>>>>>>> 32820bee7da7fee740ea5702917206b96c2986eb
      >
        <div className={cn("ds-editor-pane__content space-y-6", contentClassName)}>
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
