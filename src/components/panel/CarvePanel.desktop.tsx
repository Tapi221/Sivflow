import { forwardRef, memo, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/utils";

type PanelProps = { children: ReactNode; className?: string };
type ShellProps = PanelProps & { toolbar?: ReactNode; overlay?: ReactNode; leftPanel?: ReactNode; isLeftPanelCollapsed?: boolean; reserveToolbar?: boolean; reserveLeftPanel?: boolean; viewportRef?: Ref<HTMLDivElement>; bodyClassName?: string; viewportClassName?: string };

const SIDE