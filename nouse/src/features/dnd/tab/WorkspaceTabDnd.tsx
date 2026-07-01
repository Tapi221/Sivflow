import type { HTMLMotionProps, Transition } from "framer-motion";
import { Reorder } from "framer-motion";
import type { CSSProperties, ReactNode, RefObject } from "react";
import type { WorkspaceTab } from "@/pane.desktop/tab.desktopnative/Tab";



type WorkspaceTabDndListProps = {
  tabsListRef: RefObject<HTMLDivElement | null>;
  orderedTabs: WorkspaceTab[];
  onReorderTabs: (nextTabs: WorkspaceTab[]) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};
type WorkspaceTabDndItemProps = Omit<
  HTMLMotionProps<"div">,
  "children" | "layout" | "onDragEnd" | "onDragStart" | "style" | "value"
> & {
  tab: WorkspaceTab;
  canReorderTabs: boolean;
  tabsListRef: RefObject<HTMLDivElement | null>;
  onDragStart: () => void;
  onDragEnd: () => void;
  style?: CSSProperties;
  children: ReactNode;
};



const REORDER_ITEM_TRANSITION: Transition = {
  layout: {
    type: "tween",
    duration: 0.12,
    ease: "easeOut",
  },
  x: {
    type: "tween",
    duration: 0,
  },
  y: {
    type: "tween",
    duration: 0,
  },
};



const WorkspaceTabDndList = ({
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
const WorkspaceTabDndItem = ({
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
      dragElastic={0}
      dragMomentum={false}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      transition={REORDER_ITEM_TRANSITION}
      style={style}
      className={className}
      data-workspace-tab-kind={tab.kind}
    >
      {children}
    </Reorder.Item>
  );
};



export { WorkspaceTabDndItem, WorkspaceTabDndList };
