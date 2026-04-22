import type { ReactNode } from "react";

import {
  overlayGlassActionButtonActiveClassName,
  overlayGlassActionButtonClassName,
  overlayGlassActionButtonDisabledClassName,
} from "@/components/card/shell/overlaySurfaceClassNames";
import { cn } from "@/lib/utils";

type OverlayToolbarButtonProps = {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  children: ReactNode;
};

export const OverlayToolbarButton = ({
  onClick,
  label,
  disabled = false,
  active = false,
  className,
  children,
}: OverlayToolbarButtonProps) => {
  return (
    <button
      type="button"
      className={cn(
        overlayGlassActionButtonClassName,
        "relative",
        active && !disabled && overlayGlassActionButtonActiveClassName,
        disabled && overlayGlassActionButtonDisabledClassName,
        className,
      )}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      aria-disabled={disabled}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
