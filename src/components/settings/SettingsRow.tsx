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
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {leading ? <div className="shrink-0 pt-0.5">{leading}</div> : null}

        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "text-sm font-semibold leading-6 text-slate-900",
              titleClassName,
            )}
          >
            {title}
          </div>
          {description ? (
            <div
              className={cn(
                "mt-1 text-sm leading-6 text-slate-500",
                descriptionClassName,
              )}
            >
              {description}
            </div>
          ) : null}
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>

      {action ? (
        <div
          className={cn(
            "flex shrink-0 items-center gap-3 sm:justify-end",
            actionClassName,
          )}
        >
          {action}
        </div>
      ) : null}
    </div>
  );
};
