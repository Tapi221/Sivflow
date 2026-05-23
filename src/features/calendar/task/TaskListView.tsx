import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { format } from "date-fns";
import { AnimatedSquareCheckbox } from "@/chip/checkbox/AnimatedSquareCheckbox";
import { useT } from "@/i18n/useT";
import { TASK_COLUMNS } from "./task.types";
import type { Task } from "./task.types";
import { TaskStatusDot } from "../../../chip/icon/TaskStatusDot";

type TaskListViewProps = {
  tasks: Task[];
  onToggleTaskDone: (taskId: string, done: boolean) => void;
  onRenameTask: (taskId: string, title: string) => void;
};

type TaskColumnId =
  | "done"
  | "title"
  | "status"
  | "priority"
  | "category"
  | "dueDate";

type TaskColumn = {
  id: TaskColumnId;
  label: string;
  width: number;
  minWidth: number;
  maxWidth?: number;
  resizable: boolean;
};

const TASK_COLUMN_STORAGE_KEY = "task-list-view:column-widths:v1";

const DEFAULT_TASK_COLUMNS: TaskColumn[] = [
  {
    id: "done",
    label: "完了",
    width: 28,
    minWidth: 28,
    maxWidth: 28,
    resizable: false,
  },
  {
    id: "title",
    label: "タイトル",
    width: 520,
    minWidth: 160,
    resizable: true,
  },
  {
    id: "status",
    label: "ステータス",
    width: 220,
    minWidth: 116,
    maxWidth: 320,
    resizable: true,
  },
  {
    id: "priority",
    label: "優先度",
    width: 200,
    minWidth: 96,
    maxWidth: 260,
    resizable: true,
  },
  {
    id: "category",
    label: "カテゴリ",
    width: 260,
    minWidth: 116,
    resizable: true,
  },
  {
    id: "dueDate",
    label: "期日",
    width: 150,
    minWidth: 82,
    maxWidth: 220,
    resizable: true,
  },
];

const TABLE_HEADER_CLASS =
  "pb-2 text-left text-[12px] font-medium tracking-normal text-[#b8bcc5]";

const clampTaskColumnWidth = (
  width: number,
  minWidth: number,
  maxWidth?: number,
): number => {
  if (!Number.isFinite(width)) {
    return minWidth;
  }

  if (typeof maxWidth === "number") {
    return Math.min(Math.max(width, minWidth), maxWidth);
  }

  return Math.max(width, minWidth);
};

const loadStoredTaskColumns = (): TaskColumn[] => {
  if (typeof window === "undefined") {
    return DEFAULT_TASK_COLUMNS;
  }

  try {
    const raw = window.localStorage.getItem(TASK_COLUMN_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_TASK_COLUMNS;
    }

    const parsed = JSON.parse(raw) as Partial<Record<TaskColumnId, number>>;

    return DEFAULT_TASK_COLUMNS.map((column) => {
      const storedWidth = parsed[column.id];

      if (typeof storedWidth !== "number") {
        return column;
      }

      return {
        ...column,
        width: clampTaskColumnWidth(
          storedWidth,
          column.minWidth,
          column.maxWidth,
        ),
      };
    });
  } catch {
    return DEFAULT_TASK_COLUMNS;
  }
};

const buildTaskGridTemplateColumns = (columns: TaskColumn[]): string => {
  return columns.map((column) => `${column.width}px`).join(" ");
};

const buildTaskGridMinWidth = (columns: TaskColumn[]): number => {
  return columns.reduce((sum, column) => sum + column.width, 0);
};

const DetailIcon = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4" aria-hidden="true">
    <path
      d="M4 5.25h10M4 9h10M4 12.75h6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const TaskListView = ({
  tasks,
  onToggleTaskDone,
  onRenameTask,
}: TaskListViewProps) => {
  const t = useT();
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [columns, setColumns] = useState<TaskColumn[]>(loadStoredTaskColumns);
  const [isColumnResizing, setIsColumnResizing] = useState(false);
  const statusLabelMap = {
    not_started: t.taskStatusNotStarted,
    in_progress: t.taskStatusInProgress,
    review: t.taskStatusReview,
    done: t.taskStatusDone,
  };

  const gridTemplateColumns = useMemo(() => {
    return buildTaskGridTemplateColumns(columns);
  }, [columns]);

  const gridMinWidth = useMemo(() => {
    return buildTaskGridMinWidth(columns);
  }, [columns]);

  const gridStyle = useMemo<CSSProperties>(() => {
    return {
      gridTemplateColumns,
      minWidth: `${gridMinWidth}px`,
      width: `max(100%, ${gridMinWidth}px)`,
    };
  }, [gridMinWidth, gridTemplateColumns]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const widthMap = Object.fromEntries(
      columns.map((column) => [column.id, column.width]),
    );

    window.localStorage.setItem(
      TASK_COLUMN_STORAGE_KEY,
      JSON.stringify(widthMap),
    );
  }, [columns]);

  useEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
      resizeCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isColumnResizing) {
      return;
    }

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isColumnResizing]);

  useEffect(() => {
    if (!editingTaskId) {
      return;
    }

    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [editingTaskId]);

  const startEditingTaskTitle = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const finishEditingTaskTitle = (task: Task) => {
    const nextTitle = editingTitle.trim();

    if (nextTitle && nextTitle !== task.title) {
      onRenameTask(task.id, nextTitle);
    }

    setEditingTaskId(null);
    setEditingTitle("");
  };

  const cancelEditingTaskTitle = () => {
    setEditingTaskId(null);
    setEditingTitle("");
  };

  const handleColumnResizeReset = (columnId: TaskColumnId) => {
    setColumns((currentColumns) =>
      currentColumns.map((column) => {
        if (column.id !== columnId) {
          return column;
        }

        const defaultColumn = DEFAULT_TASK_COLUMNS.find(
          (candidate) => candidate.id === columnId,
        );

        if (!defaultColumn) {
          return column;
        }

        return {
          ...column,
          width: defaultColumn.width,
        };
      }),
    );
  };

  const handleColumnResizeStart = (
    event: ReactPointerEvent<HTMLDivElement>,
    columnId: TaskColumnId,
  ) => {
    const targetColumn = columns.find((column) => column.id === columnId);

    if (!targetColumn || !targetColumn.resizable) {
      return;
    }

    resizeCleanupRef.current?.();

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = targetColumn.width;
    setIsColumnResizing(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;

      setColumns((currentColumns) =>
        currentColumns.map((column) => {
          if (column.id !== columnId) {
            return column;
          }

          return {
            ...column,
            width: clampTaskColumnWidth(
              startWidth + deltaX,
              column.minWidth,
              column.maxWidth,
            ),
          };
        }),
      );
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setIsColumnResizing(false);
      resizeCleanupRef.current = null;
    };

    const handlePointerUp = () => {
      cleanup();
    };

    resizeCleanupRef.current = cleanup;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  const renderColumnResizeHandle = (column: TaskColumn) => {
    if (!column.resizable) {
      return null;
    }

    return (
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`${column.label} の列幅を調整`}
        title="ドラッグで列幅調整、ダブルクリックで初期幅に戻す"
        className="group/resize absolute inset-y-0 right-[-8px] z-10 flex w-4 items-center justify-center cursor-col-resize touch-none"
        onDoubleClick={() => handleColumnResizeReset(column.id)}
        onPointerDown={(event) => handleColumnResizeStart(event, column.id)}
      >
        <div className="h-[1em] w-[1px] bg-[#e5e7eb] transition-colors group-hover/resize:bg-[#9ca3af]" />
      </div>
    );
  };

  const renderTaskCell = (columnId: TaskColumnId, task: Task) => {
    const col = TASK_COLUMNS.find((candidate) => candidate.id === task.status);
    const isDone = task.status === "done";
    const checkboxColor = isDone ? "#007aff" : "#9ca3af";
    const isEditingTitle = editingTaskId === task.id;

    switch (columnId) {
      case "done":
        return (
          <div className="py-2.5 pr-2 align-top" role="cell">
            <button
              type="button"
              className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center"
              aria-label={isDone ? "Mark task as not done" : "Complete task"}
              onClick={() => onToggleTaskDone(task.id, !isDone)}
            >
              <AnimatedSquareCheckbox checked={isDone} color={checkboxColor} />
            </button>
          </div>
        );

      case "title":
        return (
          <div
            className="min-w-0 overflow-hidden py-2.5 pr-4 font-medium leading-[18px] text-[#24262d]"
            role="cell"
          >
            {isEditingTitle ? (
              <div className="min-w-0">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editingTitle}
                  aria-label="Task title"
                  className="h-[18px] w-full border-0 bg-transparent p-0 text-[13px] font-medium leading-[18px] text-[#24262d] outline-none placeholder:text-[#9ca3af]"
                  onChange={(event) => setEditingTitle(event.target.value)}
                  onBlur={() => finishEditingTaskTitle(task)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      finishEditingTaskTitle(task);
                      return;
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelEditingTaskTitle();
                    }
                  }}
                />

                <button
                  type="button"
                  className="mt-2 flex items-center gap-1.5 text-[13px] font-medium leading-[18px] text-[#6b7280] transition-colors hover:text-[#24262d]"
                >
                  <DetailIcon />
                  <span>詳細</span>
                </button>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] font-medium leading-none text-[#4c5361]">
                  {task.dueDate && (
                    <span className="inline-flex h-6 items-center rounded-full border border-[#eeeeee] px-2 text-[#8f929c]">
                      {format(new Date(task.dueDate), "MMM d")}
                    </span>
                  )}
                  <span className="inline-flex h-6 items-center rounded-full border border-[#eeeeee] px-2 capitalize">
                    {task.category}
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="block w-full truncate rounded text-left font-medium leading-[18px] text-[#24262d] transition-colors hover:bg-[#f4f5f7] focus-visible:bg-[#f4f5f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eeeeee]"
                aria-label={`Rename ${task.title}`}
                title="Click to rename"
                onClick={() => startEditingTaskTitle(task)}
              >
                {task.title}
              </button>
            )}
          </div>
        );

      case "status":
        return (
          <div className="min-w-0 overflow-hidden py-2.5 pr-4 align-top" role="cell">
            <span className="flex min-w-0 items-center gap-1.5 text-[#4c5361]">
              <TaskStatusDot color={col?.dotColor} />
              <span className="truncate">{statusLabelMap[task.status]}</span>
            </span>
          </div>
        );

      case "priority":
        return (
          <div
            className="truncate py-2.5 pr-4 align-top capitalize text-[#4c5361]"
            role="cell"
          >
            {task.priority}
          </div>
        );

      case "category":
        return (
          <div
            className="truncate py-2.5 pr-4 align-top text-[#4c5361]"
            role="cell"
          >
            {task.category}
          </div>
        );

      case "dueDate":
        return (
          <div className="truncate py-2.5 align-top text-[#8f929c]" role="cell">
            {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "—"}
          </div>
        );
    }
  };

  return (
    <div className="explorer-chrome-font min-h-0 flex-1 overflow-auto p-4">
      <div className="min-w-max" role="table" aria-label="タスク一覧">
        <div
          className="grid border-b border-[#eeeeee] text-[13px]"
          role="row"
          style={gridStyle}
        >
          {columns.map((column) => {
            if (column.id === "done") {
              return (
                <div
                  key={column.id}
                  className="relative pb-2 pr-2 text-left"
                  role="columnheader"
                >
                  <span className="sr-only">完了</span>
                  {renderColumnResizeHandle(column)}
                </div>
              );
            }

            return (
              <div
                key={column.id}
                className={`${TABLE_HEADER_CLASS} relative min-w-0 pr-4`}
                role="columnheader"
              >
                <span className="block truncate pr-2">{column.label}</span>
                {renderColumnResizeHandle(column)}
              </div>
            );
          })}
        </div>

        <div role="rowgroup">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="grid border-b border-[#eeeeee] text-[13px] hover:bg-[#fafafa]"
              role="row"
              style={gridStyle}
            >
              {columns.map((column) => (
                <div key={`${task.id}:${column.id}`} className="min-w-0">
                  {renderTaskCell(column.id, task)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
