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
        "rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className={cn("mt-5 space-y-3", bodyClassName)}>{children}</div>
    </section>
  );
};
