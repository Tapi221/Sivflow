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
    <section
      className={cn(
        "overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>

        {action ? (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        ) : null}
      </div>

      <div className={cn("space-y-3 px-5 py-5", bodyClassName)}>{children}</div>
    </section>
  );
};
