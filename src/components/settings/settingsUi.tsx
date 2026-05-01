import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SettingsTone = "neutral" | "success" | "info" | "danger";

const badgeToneClassNames: Record<SettingsTone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-600",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
};

const noteToneClassNames: Record<SettingsTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  success: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
  info: "border-sky-200 bg-sky-50/70 text-sky-800",
  danger: "border-rose-200 bg-rose-50/80 text-rose-700",
};

export const SETTINGS_ICON_SURFACE_CLASS_NAME =
  "flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-600 shadow-sm";

type SettingsBadgeProps = {
  tone?: SettingsTone;
  className?: string;
  children: ReactNode;
};

export const SettingsBadge = ({
  tone = "neutral",
  className,
  children,
}: SettingsBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em]",
        badgeToneClassNames[tone],
        className,
      )}
    >
      {children}
    </span>
  );
};

type SettingsNoteProps = {
  tone?: SettingsTone;
  className?: string;
  children: ReactNode;
};

export const SettingsNote = ({
  tone = "neutral",
  className,
  children,
}: SettingsNoteProps) => {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm leading-6",
        noteToneClassNames[tone],
        className,
      )}
    >
      {children}
    </div>
  );
};

export const SettingsKeycap = ({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 min-w-8 items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 shadow-sm",
        className,
      )}
      {...props}
    />
  );
};

type SettingsEmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
};

export const SettingsEmptyState = ({
  title,
  description,
  className,
}: SettingsEmptyStateProps) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center",
        className,
      )}
    >
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
    </div>
  );
};
