import { forwardRef, memo, type ReactNode, type Ref } from "react";
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

type CarvePanelShellProps = {
  children: ReactNode;
  toolbar?: ReactNode;
  overlay?: ReactNode;
  leftPanel?: ReactNode;
  rightPanel?: ReactNode;
  reserveToolbar?: boolean;
  reserveLeftPanel?: boolean;
  hasTrailingPanel?: boolean;
  viewportRef?: Ref<HTMLDivElement>;
  className?: string;
  bodyClassName?: string;
  viewportClassName?: string;
};

const CARVE_PANEL_SHELL_CLASS =
  "relative flex h-full min-h-0 w-full flex-col bg-transparent";

const CARVE_PANEL_BODY_CLASS =
  "relative flex min-h-0 flex-1 bg-transparent";

const CARVE_PANEL_TOOLBAR_SPACER_CLASS =
  "h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 bg-white";

const CARVE_PANEL_LEFT_SPACER_CLASS = "w-[220px] shrink-0";

const CARVE_PANEL_VIEWPORT_BASE_CLASS =
  "flex min-h-0 min-w-0 flex-1 flex-col bg-white";

const CARVE_PANEL_VIEWPORT_STANDALONE_CLASS = "pl-0 pr-0 pt-0 pb-0";

const CARVE_PANEL_VIEWPORT_WITH_TRAILING_PANEL_CLASS = "pl-0 pr-4 pt-0 pb-0";

const CARVE_PANEL_BASE_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-hidden border border-b-0 border-[#eeeeee] bg-white backdrop-blur-xl shadow-[0_18px_48px_rgba(15,23,42,0.10),0_1px_0_rgba(255,255,255,0.85)_inset]";

const CARVE_PANEL_STANDALONE_CLASS =
  "rounded-tl-[28px] rounded-tr-none border-r-0";

const CARVE_PANEL_WITH_TRAILING_PANEL_CLASS = "rounded-t-[28px]";

const CarvePanelViewportBase = forwardRef<HTMLDivElement, CarvePanelViewportProps>(
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

CarvePanelViewportBase.displayName = "CarvePanelViewportBase";

export const CarvePanelViewport = memo(CarvePanelViewportBase);

CarvePanelViewport.displayName = "CarvePanelViewport";

const CarvePanelBase = ({
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

CarvePanelBase.displayName = "CarvePanelBase";

export const CarvePanel = memo(CarvePanelBase);

CarvePanel.displayName = "CarvePanel";

export const CarvePanelShell = ({
  children,
  toolbar = null,
  overlay = null,
  leftPanel = null,
  rightPanel = null,
  reserveToolbar = false,
  reserveLeftPanel = false,
  hasTrailingPanel = false,
  viewportRef,
  className,
  bodyClassName,
  viewportClassName,
}: CarvePanelShellProps) => {
  const toolbarNode = toolbar ?? (
    reserveToolbar ? <div aria-hidden="true" className={CARVE_PANEL_TOOLBAR_SPACER_CLASS} /> : null
  );

  const leftPanelNode = leftPanel ?? (
    reserveLeftPanel ? <div aria-hidden="true" className={CARVE_PANEL_LEFT_SPACER_CLASS} /> : null
  );

  return (
    <div className={cn(CARVE_PANEL_SHELL_CLASS, className)}>
      {toolbarNode}
      {overlay}

      <div className={cn(CARVE_PANEL_BODY_CLASS, bodyClassName)}>
        {leftPanelNode}

        <CarvePanelViewport
          ref={viewportRef}
          hasTrailingPanel={hasTrailingPanel}
          className={viewportClassName}
        >
          {children}
        </CarvePanelViewport>

        {rightPanel}
      </div>
    </div>
  );
};