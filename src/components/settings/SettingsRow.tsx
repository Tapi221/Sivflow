import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SettingsRowProps = {
  title: string;
  description?: string;
  leading?: ReactNode;
  action?: ReactNode;
  className?: string;
  actionClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  children?: ReactNode;
};

export const SettingsRow = ({
  title,
  description,
  leading,
  action,
  className,
  actionClassName,
  titleClassName,
  descriptionClassName,
  children,
}: SettingsRowProps) => {
  return (
    <div className={cn("ds-settings-panel__row", className)}>
      {leading ? (
        <div className="ds-settings-panel__row-leading">{leading}</div>
      ) : null}

      <div className="ds-settings-panel__row-copy">
        <div className={cn("ds-settings-panel__row-title", titleClassName)}>
          {title}
        </div>
        {description ? (
          <div
            className={cn(
              "ds-settings-panel__row-description",
              descriptionClassName,
            )}
          >
            {description}
          </div>
        ) : null}
        {children ? <div className="mt-3">{children}</div> : null}
      </div>

      {action ? (
        <div className={cn("ds-settings-panel__row-action", actionClassName)}>
          {action}
        </div>
      ) : null}
    </div>
  );
};
