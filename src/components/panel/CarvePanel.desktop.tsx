import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type CarvePanelProps = {
  children: ReactNode;
  hasTrailingPanel?: boolean;
  className?: string;
};

type CarvePanelViewportProps = {
  children: ReactNode;
  hasTrailingPanel?: boolean;
  className?: string;
};

const CARVE_PANEL_VIEWPORT_BASE_CLASS =
  "flex min-h-0 min-w-0 flex-1 flex-col bg-white";

const CARVE_PANEL_VIEWPORT_STANDALONE_CLASS = "pl-4 pr-0 pt-0 pb-0";

const CARVE_PANEL_VIEWPORT_WITH_TRAILING_PANEL_CLASS = "px-4 pt-0 pb-0";

const CARVE_PANEL_BASE_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-hidden border border-b-0 border-[#eeeeee] bg-white backdrop-blur-xl shadow-[0_18px_48px_rgba(15,23,42,0.10),0_1px_0_rgba(255,255,255,0.85)_inset]";

const CARVE_PANEL_STANDALONE_CLASS =
  "rounded-tl-[28px] rounded-tr-none border-r-0";

const CARVE_PANEL_WITH_TRAILING_PANEL_CLASS = "rounded-t-[28px]";

export const CarvePanelViewport = forwardRef<HTMLDivElement, CarvePanelViewportProps>(
  ({ children, hasTrailingPanel = false, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          CARVE_PANEL_VIEWPORT_BASE_CLASS,
          hasTrailingPanel
            ? CARVE_PANEL_VIEWPORT_WITH_TRAILING_PANEL_CLASS
            : CARVE_PANEL_VIEWPORT_STANDALONE_CLASS,
          className,
        )}
      >
        {children}
      </div>
    );
  },
);

CarvePanelViewport.displayName = "CarvePanelViewport";

export const CarvePanel = ({
  children,
  hasTrailingPanel = false,
  className,
}: CarvePanelProps) => {
  return (
    <div
      className={cn(
        CARVE_PANEL_BASE_CLASS,
        hasTrailingPanel
          ? CARVE_PANEL_WITH_TRAILING_PANEL_CLASS
          : CARVE_PANEL_STANDALONE_CLASS,
        className,
      )}
    >
      {children}
    </div>
  );
};
