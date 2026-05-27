import { motion } from "framer-motion";
import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type UIEvent } from "react";
import { TaskStatusDot } from "@/chip/icon/TaskStatusDot";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskSortableContext, useTaskSortableCard } from "@/features/dnd/task/taskDnd.components";
import { TASK_DND_DRAG_LAYOUT_ANIMATION_DURATION_MS, TASK_DND_LAYOUT_ANIMATION_DURATION_MS } from "@/features/dnd/task/taskDnd.config";
import type { TaskDropTarget } from "@/features/dnd/task/taskDnd.types";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";
import { TASK_TYPO } from "@/styles/tokens/typography";
import { TaskCard } from "./TaskCard";
import { TaskInsertionSlot } from "./TaskInsertionSlot";
import type { Task, TaskStatus } from "./task.types";
import { TASK_COLUMNS } from "./task.types";

type TaskColumnView = {
  id: string;
  label: string;
  dotColor: string;
};

type TaskColumnProps = {
  column: TaskColumnView;
  tasks: Task[];
  activeDropTarget?: TaskDropTarget | null;
  activeTaskId?: string | null;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  onAddTask?: (columnId: string) => void;
  onDeleteTask: (id: string) => void;
  onToggleTaskDone: (id: string, done: boolean) => void;
  onTaskContextMenu?: (event: ReactMouseEvent<HTMLDivElement>, task: Task) => void;
  translateStatusLabel?: boolean;
};

type SortableTaskCardProps = {
  task: Task;
  columnId: string;
  activeTaskId?: string | null;
  isDragActive?: boolean;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  onDeleteTask: (id: string) => void;
  onToggleTaskDone: (id: string, done: boolean) => void;
  onTaskContextMenu?: (event: ReactMouseEvent<HTMLDivElement>, task: Task) => void;
};

type VirtualTaskWindow = {
  enabled: boolean;
  startIndex: number;
  endIndex: number;
  beforeHeight: number;
  afterHeight: number;
};

const taskColumnBackground = "#ffffff";
const TASK_LAYOUT_MOTION_EASING = [0.16, 1, 0.3, 1] as const;
const TASK_LAYOUT_MOTION_TRANSITION = {
  duration: TASK_DND_LAYOUT_ANIMATION_DURATION_MS / 1000,
  ease: TASK_LAYOUT_MOTION_EASING,
};
const TASK_DRAG_LAYOUT_MOTION_TRANSITION = {
  duration: TASK_DND_DRAG_LAYOUT_ANIMATION_DURATION_MS / 1000,
  ease: TASK_LAYOUT_MOTION_EASING,
};
const TASK_VIRTUAL_ROW_HEIGHT = 64;
const TASK_VIRTUAL_OVERSCAN = 6;
const TASK_VIRTUAL_MIN_ITEMS = 28;
const TASK_VIRTUAL_INITIAL_VIEWPORT_HEIGHT = 640;

const isTaskStatus = (value: string): value is TaskStatus => {
  return TASK_COLUMNS.some((column) => column.id === value);
};

const areSortableTaskCardPropsEqual = (
  previousProps: SortableTaskCardProps,
  nextProps: SortableTaskCardProps,
) => {
  return (
    previousProps.task === nextProps.task &&
    previousProps.columnId === nextProps.columnId &&
    previousProps.activeTaskId === nextProps.activeTaskId &&
    previousProps.isDragActive === nextProps.isDragActive &&
    previousProps.accountName === nextProps.accountName &&
    previousProps.accountPhotoUrl === nextProps.accountPhotoUrl &&
    previousProps.onDeleteTask === nextProps.onDeleteTask &&
    previousProps.onToggleTaskDone === nextProps.onToggleTaskDone &&
    previousProps.onTaskContextMenu === nextProps.onTaskContextMenu
  );
};

const useVirtualTaskWindow = (
  tasksLength: number,
  isDragActive: boolean,
) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const latestScrollTopRef = useRef(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(TASK_VIRTUAL_INITIAL_VIEWPORT_HEIGHT);
  const enabled = !isDragActive && tasksLength > TASK_VIRTUAL_MIN_ITEMS;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateViewportHeight = () => {
      setViewportHeight(viewport.clientHeight || TASK_VIRTUAL_INITIAL_VIEWPORT_HEIGHT);
    };

    updateViewportHeight();

    if (typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(updateViewportHeight);
    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (!enabled) {
      latestScrollTopRef.current = 0;
      setScrollTop(0);
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) return;

    latestScrollTopRef.current = viewport.scrollTop;
    setScrollTop(viewport.scrollTop);
  }, [enabled, tasksLength]);

  useLayoutEffect(() => {
    return () => {
      if (scrollRafRef.current === null) return;

      window.cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    };
  }, []);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    if (!enabled) return;

    latestScrollTopRef.current = event.currentTarget.scrollTop;

    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      setScrollTop(latestScrollTopRef.current);
    });
  }, [enabled]);

  const virtualWindow = useMemo<VirtualTaskWindow>(() => {
    if (!enabled) {
      return {
        enabled: false,
        startIndex: 0,
        endIndex: tasksLength,
        beforeHeight: 0,
        afterHeight: 0,
      };
    }

    const rawStartIndex = Math.floor(scrollTop / TASK_VIRTUAL_ROW_HEIGHT) - TASK_VIRTUAL_OVERSCAN;
    const startIndex = Math.max(0, Math.min(tasksLength - 1, rawStartIndex));
    const visibleCount = Math.ceil(viewportHeight / TASK_VIRTUAL_ROW_HEIGHT) + TASK_VIRTUAL_OVERSCAN * 2;
    const endIndex = Math.min(tasksLength, startIndex + visibleCount);
    const beforeHeight = startIndex * TASK_VIRTUAL_ROW_HEIGHT;
    const afterHeight = Math.max(0, (tasksLength - endIndex) * TASK_VIRTUAL_ROW_HEIGHT);

    return {
      enabled: true,
      startIndex,
      endIndex,
      beforeHeight,
      afterHeight,
    };
  }, [enabled, scrollTop, tasksLength, viewportHeight]);

  return {
    handleScroll,
    viewportRef,
    virtualWindow,
  };
};

const SortableTaskCardComponent = ({
  task,
  columnId,
  activeTaskId,
  isDragActive = false,
  accountName,
  accountPhotoUrl,
  onDeleteTask,
  onToggleTaskDone,
  onTaskContextMenu,
}: SortableTaskCardProps) => {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
  } = useTaskSortableCard({ task, columnId });
  const isActivePreview = activeTaskId === task.id;

  return (
    <motion.div
      ref={setNodeRef}
      layout={isDragActive ? "position" : false}
      transition={
        isDragActive
          ? TASK_DRAG_LAYOUT_MOTION_TRANSITION
          : TASK_LAYOUT_MOTION_TRANSITION
      }
      className={cn(
        "relative z-10 rounded-xl touch-none transform-gpu",
        "transition-[opacity,filter] duration-[220ms] ease-[cubic-bezier(.22,1,.36,1)]",
        isActivePreview && "opacity-40 saturate-75",
        isDragging && "relative z-20 opacity-0",
      )}
      {...attributes}
      {...listeners}
    >
      <TaskCard
        task={task}
        accountName={accountName}
        accountPhotoUrl={accountPhotoUrl}
        isDragging={isDragging}
        onDelete={onDeleteTask}
        onToggleDone={onToggleTaskDone}
        onContextMenu={onTaskContextMenu}
      />
    </motion.div>
  );
};

const TaskColumnComponent = ({
  column,
  tasks,
  activeDropTarget,
  activeTaskId,
  accountName,
  accountPhotoUrl,
  onAddTask,
  onDeleteTask,
  onToggleTaskDone,
  onTaskContextMenu,
  translateStatusLabel = false,
}: TaskColumnProps) => {
  const t = useT();
  const statusLabelMap = {
    not_started: t.taskStatusNotStarted,
    in_progress: t.taskStatusInProgress,
    review: t.taskStatusReview,
    done: t.taskStatusDone,
  };
  const columnLabel =
    translateStatusLabel && isTaskStatus(column.id)
      ? statusLabelMap[column.id]
      : column.label;
  const isDragActive = activeTaskId !== null && activeTaskId !== undefined;
  const taskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);
  const nonActiveTasks = useMemo(
    () => tasks.filter((task) => task.id !== activeTaskId),
    [activeTaskId, tasks],
  );
  const nonActiveTaskInsertIndexById = useMemo(() => {
    return new Map(nonActiveTasks.map((task, index) => [task.id, index + 1]));
  }, [nonActiveTasks]);
  const activeInsertIndex =
    activeDropTarget?.columnId === column.id ? activeDropTarget.insertIndex : null;
  const { handleScroll, viewportRef, virtualWindow } = useVirtualTaskWindow(tasks.length, isDragActive);
  const visibleTasks = virtualWindow.enabled
    ? tasks.slice(virtualWindow.startIndex, virtualWindow.endIndex)
    : tasks;
  const spacerStyle = useMemo<CSSProperties>(() => {
    if (!virtualWindow.enabled) return {};

    return {
      paddingTop: virtualWindow.beforeHeight,
      paddingBottom: virtualWindow.afterHeight,
    };
  }, [virtualWindow.afterHeight, virtualWindow.beforeHeight, virtualWindow.enabled]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-col px-3 pt-1.5 pb-0",
        "transition-[background-color,box-shadow] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
        isDragActive && "shadow-[inset_0_0_0_1px_rgba(17,24,39,0.03)]",
      )}
      style={{ background: taskColumnBackground }}
    >
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <TaskStatusDot color={column.dotColor} />
        <span className={TASK_TYPO.columnTitle}>
          {columnLabel}
        </span>
        <span className={cn("ml-0.5 flex h-4 min-w-4 items-center justify-center rounded px-1", TASK_TYPO.count)}>
          {tasks.length}
        </span>
        {onAddTask ? (
          <button
            type="button"
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-[#9aa3b1] transition-colors hover:bg-[#eceef1] hover:text-[#193a5c]"
            onClick={() => onAddTask(column.id)}
            aria-label={t.addTask}
            title={t.addTask}
          >
            <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5">
              <path
                d="M7 2.5v9M2.5 7h9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
      </div>

      <ScrollArea
        className="-mr-3 min-h-0 flex-1 overscroll-contain"
        viewportRef={viewportRef}
        viewportProps={{ onScroll: handleScroll }}
      >
        <TaskSortableContext columnId={column.id} taskIds={taskIds}>
          <div
            className={cn(
              "flex min-h-8 flex-col pr-3",
              "transition-[padding,border-color,background-color] duration-[220ms] ease-[cubic-bezier(.22,1,.36,1)]",
            )}
            style={spacerStyle}
          >
            <TaskInsertionSlot
              columnId={column.id}
              insertIndex={0}
              overTaskId={nonActiveTasks[0]?.id ?? null}
              isActive={activeInsertIndex === 0}
              isFirst
              isDragActive={isDragActive}
            />
            {visibleTasks.map((task) => {
              const isActiveTask = task.id === activeTaskId;
              const insertIndex = isActiveTask
                ? -1
                : nonActiveTaskInsertIndexById.get(task.id) ?? -1;
              const isLastTask = insertIndex === nonActiveTasks.length;

              return (
                <div key={task.id}>
                  <SortableTaskCard
                    task={task}
                    columnId={column.id}
                    activeTaskId={activeTaskId}
                    isDragActive={isDragActive}
                    accountName={accountName}
                    accountPhotoUrl={accountPhotoUrl}
                    onDeleteTask={onDeleteTask}
                    onToggleTaskDone={onToggleTaskDone}
                    onTaskContextMenu={onTaskContextMenu}
                  />
                  {!isActiveTask && (
                    <TaskInsertionSlot
                      columnId={column.id}
                      insertIndex={insertIndex}
                      overTaskId={task.id}
                      position="after"
                      isActive={activeInsertIndex === insertIndex}
                      isLast={isLastTask}
                      isDragActive={isDragActive}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </TaskSortableContext>
      </ScrollArea>
    </div>
  );
};

const SortableTaskCard = memo(SortableTaskCardComponent, areSortableTaskCardPropsEqual);
const TaskColumn = TaskColumnComponent;

SortableTaskCard.displayName = "SortableTaskCard";

export { TaskColumn };
