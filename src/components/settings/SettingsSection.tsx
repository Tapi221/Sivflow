import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SettingsSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export const SettingsSection = ({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: SettingsSectionProps) => {
  return (
    <section className={cn("ds-settings-panel__section", className)}>
      <div className="ds-settings-panel__section-head">
        <div className="min-w-0">
          <h2 className="ds-settings-panel__section-title">{title}</h2>
          {description ? (
            <p className="ds-settings-panel__section-description">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className={cn("mt-4", bodyClassName)}>{children}</div>
    </section>
  );
};
