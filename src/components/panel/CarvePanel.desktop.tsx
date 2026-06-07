import { forwardRef, memo, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/utils";

type CarvePanelProps = {
  children: ReactNode;
  className?: string;
};

type CarvePanelViewportProps = {
  children: ReactNode;
  className?: string;
};

type CarvePanelShellProps = {
  children: ReactNode;
  toolbar?: ReactNode;
  overlay?: ReactNode;
  leftPanel?: ReactNode;
  isLeftPanelCollapsed?: boolean;
  reserveToolbar?: boolean;
  reserveLeftPanel?: boolean;
  viewportRef?: Ref<HTMLDivElement>;
  className?: string;
  bodyClassName?: string;
  viewportClassName?: string;
};

const CARVE_PANEL_SHELL_CLASS = "relative flex h-full min-h-0 w-full flex-col bg-[var(--carvepanel-surface)]";
const CARVE_PANEL_BODY_CLASS = "relative isolate flex min-h-0 flex-1 bg-[var(--carvepanel-surface)]";
const CARVE_PANEL_TOOLBAR_SPACER_CLASS = "h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 bg-[var(--carvepanel-surface)]";
const CARVE_PANEL_LEFT_SPACER_CLASS = "w-[232px] shrink-0";
const CARVE_PANEL_LEFT_PANEL_CLASS = "pointer-events-auto relative z-[80] w-[232px] shrink-0 overflow-hidden";
const CARVE_PANEL_VIEWPORT_BASE_CLASS = "relative z-0 isolate flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--carvepanel-surface)]";
const CARVE_PANEL_VIEWPORT_CLASS = "pl-0 pr-0 pt-0 pb-0";
const CARVE_PANEL_BASE_CLASS