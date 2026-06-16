import { cn } from "@web-renderer/lib/utils";
import type { ReactNode } from "react";
import { overlayGlassActionButtonActiveClassName, overlayGlassActionButtonClassName, overlayGlassActionButtonDisabledClassName } from "@/components/card/shell/overlaySurfaceClassNames";

type OverlayToolbarButtonProps = {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  children: ReactNode;
};

const OverlayToolbarButton = ({ onClick, label, disabled = false, active = false, className, children }: OverlayToolbarButtonProps) => {
  return (<button type="button" className={cn(overlayGlassActionButtonClassName, "relative", active && !disabled && overlayGlassActionButtonActiveClassName, disabled && overlayGlassActionButtonDisabledClassName, className)} onClick={onClick} aria-label={label} title={label} aria-pressed={active} aria-disabled={disabled} disabled={disabled} > {children} </button>);
};

export { OverlayToolbarButton };
