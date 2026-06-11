import { useEffect, useRef, useState } from "react";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import type { WorkspaceTab } from "@/pane.desktop/tab.desktopnative/Tab";



type UseWorkspaceTabDndArgs = {
  tabs: WorkspaceTab[];
  reorderTabs: (nextTabs: WorkspaceTab[]) => void;
  onDragStart?: () => void;
};



const areTabOrdersEqual = (
  leftTabs: WorkspaceTab[],
  rightTabs: WorkspaceTab[],
): boolean => {
  if (leftTabs.length !== rightTabs.length) return false;

  return leftTabs.every((tab, index) => tab.id === rightTabs[index]?.id);
};
const useWorkspaceTabDnd = ({ tabs, reorderTabs, onDragStart }: UseWorkspaceTabDndArgs) => {
  const tabsListRef = useRef<HTMLDivElement | null>(null);
  const suppressTabClickRef = useRef(false);
  const isDraggingTabsRef = useRef(false);
  const orderedTabsRef = useRef<WorkspaceTab[]>(tabs);
  const [orderedTabs, setOrderedTabs] = useState<WorkspaceTab[]>(tabs);
  const canReorderTabs = orderedTabs.length > 1;

  useEffect(() => {
    if (isDraggingTabsRef.current) return;

    let cancelled = false;
    orderedTabsRef.current = tabs;
    queueMicrotask(() => {
      if (cancelled || isDraggingTabsRef.current) return;
      setOrderedTabs(tabs);
    });

    return () => {
      cancelled = true;
    };
  }, [tabs]);

  const resetTabClickSuppressionAfterEvent = () => {
    window.setTimeout(() => {
      suppressTabClickRef.current = false;
    }, 0);
  };

  const suppressNextTabClick = () => {
    suppressTabClickRef.current = true;
    resetTabClickSuppressionAfterEvent();
  };

  const isTabClickSuppressed = () => suppressTabClickRef.current;

  const handleReorderTabs = (nextTabs: WorkspaceTab[]) => {
    if (!canReorderTabs) return;

    orderedTabsRef.current = nextTabs;
    setOrderedTabs(nextTabs);
  };

  const commitReorderedTabs = () => {
    const currentTabs = useWorkspaceTabsStore.getState().tabs;
    const nextTabs = orderedTabsRef.current;

    if (!areTabOrdersEqual(currentTabs, nextTabs)) {
      reorderTabs(nextTabs);
    }

    const committedTabs = useWorkspaceTabsStore.getState().tabs;
    orderedTabsRef.current = committedTabs;
    setOrderedTabs(committedTabs);
  };

  const handleTabDragStart = () => {
    isDraggingTabsRef.current = true;
    suppressTabClickRef.current = true;
    onDragStart?.();
  };

  const handleTabDragEnd = () => {
    isDraggingTabsRef.current = false;
    commitReorderedTabs();
    resetTabClickSuppressionAfterEvent();
  };

  return {
    canReorderTabs,
    handleReorderTabs,
    handleTabDragEnd,
    handleTabDragStart,
    isTabClickSuppressed,
    orderedTabs,
    suppressNextTabClick,
    tabsListRef,
  };
};



export { useWorkspaceTabDnd };
