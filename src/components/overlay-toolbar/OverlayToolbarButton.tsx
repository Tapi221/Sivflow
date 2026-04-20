import type { ReactNode } from "react";

import { overlayGlassActionButtonClassName } from "@/components/card/shell/overlaySurfaceClassNames";
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
        active &&
          !disabled &&
          "border-[rgba(214,198,182,0.96)] bg-[rgba(255,252,247,0.98)] text-[#3d342d] shadow-[inset_0_0_0_1px_rgba(107,95,85,0.08)]",
        disabled &&
          "border-[rgba(233,224,216,0.88)] bg-[rgba(255,250,245,0.56)] text-[#baaea4] hover:bg-[rgba(255,250,245,0.56)] hover:text-[#baaea4]",
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
