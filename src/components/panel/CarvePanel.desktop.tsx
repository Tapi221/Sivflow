import { forwardRef, memo, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/utils";

type CarvePanelProps = { children: ReactNode; className?: string };
type CarvePanelViewportProps = { children: ReactNode; className?: string };
type CarvePanelShellProps = { children: ReactNode; toolbar?: ReactNode; overlay?: ReactNode; leftPanel?: ReactNode; isLeftPanelCollapsed?: boolean; reserveToolbar?: boolean; reserveLeftPanel?: boolean; viewportRef?: Ref<HTMLDivElement>; className?: string; bodyClassName?: string; viewportClassName?: string };

const SHELL = "relative flex h-full min-h-0 w-full flex-col bg-[var(--carvepanel-surface)]";
const BODY = "relative isolate flex min-h-0 flex-1 bg-[