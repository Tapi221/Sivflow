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
  viewportRef?: Ref<HTML