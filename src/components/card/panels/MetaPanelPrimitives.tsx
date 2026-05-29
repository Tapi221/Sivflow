import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { SurfaceButton, type SurfaceButtonProps } from "@/components/ui/surface-button";
import { cn } from "@/lib/utils";

type MetaPanelActionRowAlign = "start" | "between" | "end";

type MetaPanelActionRowProps = {
  children: React.ReactNode;
  className?: string;
  align?: MetaPanelActionRowAlign;
};

type MetaPanelSectionHeaderProps = {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  actionClassName?: string;
};

type MetaPanelInfoRowProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
};

type MetaPanelSurfaceFieldProps = {
  children: React.ReactNode;
  className?: string;
  muted?: boolean;
};

type MetaPanelSwitchRowProps = {
  label: React.ReactNode;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  switchAriaLabel?: string;
};

type MetaPanelSectionTitleProps = {
  children: React.ReactNode;
  className?: string;
};

type MetaPanelMutedSurfaceProps = {
  children: React.ReactNode;
  className?: string;
};

type MetaPanelSwitchProps = {
  checked: boolean;
  label: React.ReactNode;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  switchAriaLabel?: string;
};

const META_PANEL_ACTION_ROW_ALIGN_CLASS: Record<MetaPanelActionRowAlign, string> = {
  start: "ds-editor-pane__action-row--start",
  between: "ds-editor-pane__action-row--between",
  end: "ds-editor-pane__action-row--end",
};

const MetaPanelActionRow = ({
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

const MetaPanelSectionHeader = ({
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
      {action ? (
        <div className={cn("shrink-0", actionClassName)}>{action}</div>
      ) : null}
    </MetaPanelActionRow>
  );
};

const MetaPanelInfoRow = ({
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

const MetaPanelSurfaceField = ({
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

const MetaPanelInput = React.forwardRef<
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

const MetaPanelSectionActionButton = React.forwardRef<
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

const MetaPanelSwitchRow = ({
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

const MetaPanelSectionTitle = ({
  children,
  className,
}: MetaPanelSectionTitleProps) => {
  return (
    <h3 className={cn("ds-editor-pane__section-title", className)}>
      {children}
    </h3>
  );
};

const MetaPanelMutedSurface = ({
  children,
  className,
}: MetaPanelMutedSurfaceProps) => {
  return (
    <div
      className={cn(
        "ds-editor-pane__surface ds-editor-pane__surface--muted px-2 py-1",
        className,
      )}
    >
      {children}
    </div>
  );
};

const MetaPanelSwitch = ({
  checked,
  label,
  onCheckedChange,
  disabled = false,
  className,
  labelClassName,
  switchAriaLabel,
}: MetaPanelSwitchProps) => {
  const accessibleLabel = typeof label === "string" ? label : switchAriaLabel;

  return (
    <MetaPanelActionRow className={cn("justify-start gap-2", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={accessibleLabel}
        disabled={disabled}
        onClick={() => {
          onCheckedChange?.(!checked);
        }}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-[background-color,border-color,opacity] duration-150",
          checked
            ? "border-transparent bg-[var(--meta-panel-accent)]"
            : "border-[color:var(--meta-panel-border)] bg-[color:var(--meta-panel-surface-elevated)] shadow-[var(--meta-panel-shadow-soft)]",
          disabled && "opacity-60",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-150",
            checked && "translate-x-4",
          )}
        />
      </button>
      <span className={cn("ds-editor-pane__inline-label", labelClassName)}>
        {label}
      </span>
    </MetaPanelActionRow>
  );
};

MetaPanelInput.displayName = "MetaPanelInput";
MetaPanelSectionActionButton.displayName = "MetaPanelSectionActionButton";

export { MetaPanelActionRow, MetaPanelInfoRow, MetaPanelInput, MetaPanelMutedSurface, MetaPanelSectionActionButton, MetaPanelSectionHeader, MetaPanelSectionTitle, MetaPanelSurfaceField, MetaPanelSwitch, MetaPanelSwitchRow };
