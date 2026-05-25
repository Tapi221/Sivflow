import { Reorder } from "framer-motion";
import type { CSSProperties, HTMLAttributes, ReactNode, RefObject } from "react";
import type { WorkspaceTab } from "@/features/tab/Tab";

type WorkspaceTabDndListProps = {
  tabsListRef: RefObject<HTMLDivElement | null>;
  orderedTabs: WorkspaceTab[];
  onReorderTabs: (nextTabs: WorkspaceTab[]) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

type WorkspaceTabDndItemProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "onDragEnd" | "onDragStart" | "style"
> & {
  tab: WorkspaceTab;
  canReorderTabs: boolean;
  tabsListRef: RefObject<HTMLDivElement | null>;
  onDragStart: () => void;
  onDragEnd: () => void;
  style?: CSSProperties;
  children: ReactNode;
};

export const WorkspaceTabDndList = ({
  tabsListRef,
  orderedTabs,
  onReorderTabs,
  className,
  style,
  children,
}: WorkspaceTabDndListProps) => {
  return (
    <Reorder.Group
      ref={tabsListRef}
      as="div"
      axis="x"
      values={orderedTabs}
      onReorder={onReorderTabs}
      className={className}
      style={style}
    >
      {children}
    </Reorder.Group>
  );
};

export const WorkspaceTabDndItem = ({
  tab,
  canReorderTabs,
  tabsListRef,
  onDragStart,
  onDragEnd,
  style,
  className,
  children,
  ...itemProps
}: WorkspaceTabDndItemProps) => {
  return (
    <Reorder.Item
      {...itemProps}
      as="div"
      value={tab}
      drag={canReorderTabs ? "x" : false}
      dragListener={canReorderTabs}
      dragConstraints={tabsListRef}
      dragElastic={canReorderTabs ? 0.08 : 0}
      dragMomentum={false}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      transition={{ type: "spring", stiffness: 520, damping: 42 }}
      style={style}
      className={className}
      data-workspace-tab-kind={tab.kind}
    >
      {children}
    </Reorder.Item>
  );
};