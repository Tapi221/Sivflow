import "./dialog.css";
import { memo } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

type DialogDesktopPanelProps = {
  className?: string;
  surfaceClassName?: string;
  ariaLabel?: string;
  children?: ReactNode;
  onClose?: () => void;
};

const DialogDesktopPanelBase = ({ className, surfaceClassName, ariaLabel, children, onClose }: DialogDesktopPanelProps) => {
  const handleBackdropMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose?.();
  };

  return (
    <div className={cn("dialog-desktop-backdrop", className)} onMouseDown={handleBackdropMouseDown}>
      <section className={cn("dialog-desktop-surface", surfaceClassName)} role="dialog" aria-modal="true" aria-label={ariaLabel}>
        {children}
      </section>
    </div>
  );
};

const DialogDesktopPanel = memo(DialogDesktopPanelBase);
DialogDesktopPanel.displayName = "DialogDesktopPanel";

export { DialogDesktopPanel };
export type { DialogDesktopPanelProps };
