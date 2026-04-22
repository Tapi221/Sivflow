import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { SurfaceButton, type SurfaceButtonProps } from "@/components/ui/surface-button";
import { cn } from "@/lib/utils";

type MetaPanelActionRowAlign = "start" | "between" | "end";

const META_PANEL_ACTION_ROW_ALIGN_CLASS: Record<MetaPanelActionRowAlign, string> = {
  start: "ds-editor-pane__action-row--start",
  between: "ds-editor-pane__action-row--between",
  end: "ds-editor-pane__action-row--end",
};

type MetaPanelActionRowProps = {
  children: React.ReactNode;
  className?: string;
  align?: MetaPanelActionRowAlign;
};

export const MetaPanelActionRow = ({
  children,
  className,
  align = "start",
}: MetaPanelActionRowProps) => {
  return (
    <div
      className={cn(
        "ds-editor-pane__action-row",
        META_PANEL_ACTION_ROW_ALIGN_CLASS[align],
        className,
      )}
    >
      {children}
    </div>
  );
};

type MetaPanelSectionHeaderProps = {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  actionClassName?: string;
};

export const MetaPanelSectionHeader = ({
  title,
  action,
  className,
  titleClassName,
  actionClassName,
}: MetaPanelSectionHeaderProps) => {
  return (
    <MetaPanelActionRow align="between" className={className}>
      <h3 className={cn("ds-editor-pane__section-title", titleClassName)}>
        {title}
      </h3>
      {action ? <div className={cn("shrink-0", actionClassName)}>{action}</div> : null}
    </MetaPanelActionRow>
  );
};

type MetaPanelInfoRowProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
};

export const MetaPanelInfoRow = ({
  label,
  value,
  className,
  valueClassName,
}: MetaPanelInfoRowProps) => {
  return (
    <p className={cn("ds-editor-pane__info-row", className)}>
      <span className="ds-editor-pane__info-label">{label}</span>{" "}
      <span className={cn("ds-editor-pane__info-value", valueClassName)}>
        {value}
      </span>
    </p>
  );
};

type MetaPanelSurfaceFieldProps = {
  children: React.ReactNode;
  className?: string;
  muted?: boolean;
};

export const MetaPanelSurfaceField = ({
  children,
  className,
  muted = false,
}: MetaPanelSurfaceFieldProps) => {
  return (
    <div
      className={cn(
        "ds-editor-pane__surface ds-editor-pane__surface-field",
        muted && "ds-editor-pane__surface--muted",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MetaPanelInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn("ds-input ds-editor-pane__input", className)}
      {...props}
    />
  );
});

MetaPanelInput.displayName = "MetaPanelInput";

export const MetaPanelSectionActionButton = React.forwardRef<
  HTMLButtonElement,
  SurfaceButtonProps
>(({ className, surface = "convex", size = "xs", ...props }, ref) => {
  return (
    <SurfaceButton
      ref={ref}
      surface={surface}
      size={size}
      className={cn("ds-editor-pane__section-action", className)}
      {...props}
    />
  );
});

MetaPanelSectionActionButton.displayName = "MetaPanelSectionActionButton";

type MetaPanelSwitchRowProps = {
  label: React.ReactNode;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  switchAriaLabel?: string;
};

export const MetaPanelSwitchRow = ({
  label,
  checked,
  onCheckedChange,
  disabled = false,
  className,
  labelClassName,
  switchAriaLabel,
}: MetaPanelSwitchRowProps) => {
  const accessibleLabel = typeof label === "string" ? label : switchAriaLabel;

  return (
    <MetaPanelActionRow className={className}>
      <SwitchPrimitives.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={accessibleLabel}
        className="ds-editor-pane__switch"
      >
        <SwitchPrimitives.Thumb className="ds-editor-pane__switch-thumb" />
      </SwitchPrimitives.Root>
      <span className={cn("ds-editor-pane__inline-label", labelClassName)}>
        {label}
      </span>
    </MetaPanelActionRow>
  );
};
