import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { TaskPriorityBadge } from "@/chip/budge/TaskPriorityBadge";
import { AnimatedSquareCheckbox } from "@/chip/checkbox/AnimatedSquareCheckbox";
import { TrashIcon } from "@/components/icons/icons.card";
import { CATEGORY_CONFIG, TASK_COLUMNS } from "./task.types";
import type { Task, TaskGroupMode, TaskStatus } from "./task.types";

type TaskListViewProps = {
  tasks: Task[];
  groupMode: TaskGroupMode;
  onToggleTaskDone: (taskId: string, done: boolean) => void;
  onRenameTask: (taskId: string, title: string) => void;
  onChangeTaskDueDate?: (taskId: string, dueDate: string | null) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskContextMenu?: (event: ReactMouseEvent<HTMLDivElement>, task: Task) => void;
};

type TaskGroup = {
  id: string;
  label: string;
  tasks: Task[];
  color?: string;
};

type ColId = "done" | "title" | "priority" | "category" | "dueDate" | "actions";

type ColDef = {
  id: ColId;
  label: string;
  width: number;
  minWidth: number;
  resizable: boolean;
};

const STORAGE_KEY = "calendar-task-list:col-widths:v1";

const DEFAULT_COLS: ColDef[] = [
  { id: "done", label: "", width: 32, minWidth: 32, resizable: false },
  { id: "title", label: "タイトル", width: 520, minWidth: 160, resizable: true },
  { id: "priority", label: "優先度", width: 96, minWidth: 72, resizable: true },
  { id: "category", label: "カテゴリ", width: 160, minWidth: 100, resizable: true },
  { id: "dueDate", label: "期日", width: 150, minWidth: 110, resizable: true },
  { id: "actions", label: "", width: 40, minWidth: 40, resizable: false },
];

const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "未着手",
  in_progress: "進行中",
  review: "レビュー",
  done: "完了",
};

const clamp = (value: number, min: number) => Math.max(value, min);

const loadCols = (): ColDef[] => {
  if (typeof window === "undefined") return DEFAULT_COLS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COLS;

    const stored = JSON.parse(raw) as Partial<Record<ColId, number>>;
    return DEFAULT_COLS.map((col) => {
      const width = stored[col.id];
      return typeof width === "number" ? { ...col, width: clamp(width, col.minWidth) } : col;
    });
  } catch {
    return DEFAULT_COLS;
  }
};

const getCategoryConfig = (category: string) => {
  return (
    CATEGORY_CONFIG[category] ?? {
      label: category,
      bg: "#f3f4f6",
      text: "#6b7280",
    }
  );
};

type ResizeHandleProps = {
  colId: ColId;
  isActive: boolean;
  onStart: (event: ReactPointerEvent<HTMLDivElement>, colId: ColId) => void;
  onReset: (colId: ColId) => void;
};

const ResizeHandle = ({ colId, isActive, onStart, onReset }: ResizeHandleProps) => (
  <div
    role="separator"
    aria-orientation="vertical"
    className="absolute right-0 top-0 z-10 flex h-full w-3 cursor-col-resize touch-none select-none items-center justify-center group/resize-handle"
    onDoubleClick={() => onReset(colId)}
    onPointerDown={(event) => onStart(event, colId)}
  >
    <div className={`h-4 w-px transition-all group-hover/header-cell:opacity-100 group-hover/resize-handle:bg-[#b8bcc6] ${isActive ? "bg-[#b8bcc6] opacity-100" : "bg-[#e5e7eb] opacity-0"}`} />
  </div>
);

export const TaskListView = ({
  tasks,
  groupMode,
  onToggleTaskDone,
  onRenameTask,
  onChangeTaskDueDate,
  onDeleteTask,
  onTaskContextMenu,
}: TaskListViewProps) => {
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const [cols, setCols] = useState<ColDef[]>(loadCols);
  const [resizingColId, setResizingColId] = useState<ColId | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const isResizing = resizingColId !== null;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const widthMap = Object.fromEntries(cols.map((col) => [col.id, col.width]));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widthMap));
  }, [cols]);

  useEffect(() => {
    if (!isResizing) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isResizing]);

  useEffect(() => () => {
    resizeCleanupRef.current?.();
  }, []);

  const grouped = useMemo<TaskGroup[]>(() => {
    if (groupMode === "status") {
      return TASK_COLUMNS.map((column) => ({
        id: column.id,
        label: STATUS_LABEL[column.id],
        tasks: tasks.filter((task) => task.status === column.id),
        color: column.color,
      }));
    }

    const sectionGroups = new Map<string, TaskGroup>();

    tasks.forEach((task) => {
      const category = getCategoryConfig(task.category);
      const existing = sectionGroups.get(task.category);

      if (existing) {
        existing.tasks.push(task);
        return;
      }

      sectionGroups.set(task.category, {
        id: task.category,
        label: category.label,
        tasks: [task],
        color: category.text,
      });
    });

    return Array.from(sectionGroups.values());
  }, [groupMode, tasks]);

  const gridMinWidth = useMemo(() => cols.reduce((total, col) => total + col.width, 0), [cols]);
  const gridTemplateColumns = useMemo(() => cols.map((col) => `${col.width}px`).join(" "), [cols]);
  const gridStyle = useMemo<CSSProperties>(() => ({ gridTemplateColumns }), [gridTemplateColumns]);

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>, colId: ColId) => {
    const target = cols.find((col) => col.id === colId);
    if (!target?.resizable) return;

    resizeCleanupRef.current?.();
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = target.width;
    setResizingColId(colId);

    const onMove = (pointerEvent: PointerEvent) => {
      setCols((currentCols) => currentCols.map((col) => {
        if (col.id !== colId) return col;
        return { ...col, width: clamp(startWidth + pointerEvent.clientX - startX, col.minWidth) };
      }));
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setResizingColId(null);
      resizeCleanupRef.current = null;
    };

    const onUp = () => cleanup();
    resizeCleanupRef.current = cleanup;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const handleResizeReset = (colId: ColId) => {
    const defaultCol = DEFAULT_COLS.find((col) => col.id === colId);
    if (!defaultCol) return;

    setCols((currentCols) => currentCols.map((col) => (col.id === colId ? { ...col, width: defaultCol.width } : col)));
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditingTitle(task.title);
  };

  const finishEdit = (task: Task) => {
    const nextTitle = editingTitle.trim();
    if (nextTitle && nextTitle !== task.title) {
      onRenameTask(task.id, nextTitle);
    }
    setEditingId(null);
    setEditingTitle("");
  };

  const renderEmptyCells = () => cols.slice(2).map((col) => <div key={col.id} />);

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-white">
      <div
        className="sticky top-0 z-20 grid border-b border-[#eeeeee] bg-white text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8f929c]"
        style={{ ...gridStyle, minWidth: `${gridMinWidth}px` }}
      >
        {cols.map((col) => (
          <div key={col.id} className="group/header-cell relative flex h-8 items-center pr-3">
            {col.label}
            {col.resizable && <ResizeHandle colId={col.id} isActive={resizingColId === col.id} onStart={handleResizeStart} onReset={handleResizeReset} />}
          </div>
        ))}
      </div>

      <div style={{ minWidth: `${gridMinWidth}px` }}>
        {grouped.length === 0 ? (
          <div className="grid border-b border-[#f5f5f5]" style={gridStyle}>
            <div />
            <div className="py-2 pr-3 text-[12px] italic text-[#c7c7cc]">タスクなし</div>
            {renderEmptyCells()}
          </div>
        ) : (
          grouped.map((group) => (
            <section key={group.id}>
              <div className="grid border-b border-[#f0f0f0] bg-white" style={gridStyle}>
                <div />
                <div className="flex items-center gap-2 py-2 pr-3 text-[12px] font-semibold text-[#8f929c]">
                  {groupMode === "section" && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: group.color ?? "#8f929c" }}
                    />
                  )}
                  {group.label}
                  <span className="text-[11px] font-medium text-[#b0b4be]">{group.tasks.length}</span>
                </div>
                {renderEmptyCells()}
              </div>

              {group.tasks.length === 0 ? (
                <div className="grid border-b border-[#f5f5f5]" style={gridStyle}>
                  <div />
                  <div className="py-2 pr-3 text-[12px] italic text-[#c7c7cc]">タスクなし</div>
                  {renderEmptyCells()}
                </div>
              ) : (
                group.tasks.map((task) => {
                  const isDone = task.status === "done";
                  const category = getCategoryConfig(task.category);

                  return (
                    <div
                      key={task.id}
                      className={`group/row grid border-b border-[#f5f5f5] transition-colors hover:bg-[#fafafa] ${isDone ? "opacity-50" : ""}`}
                      style={gridStyle}
                      onContextMenu={onTaskContextMenu ? (contextMenuEvent) => onTaskContextMenu(contextMenuEvent, task) : undefined}
                    >
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          aria-label={isDone ? "未完了に戻す" : "完了にする"}
                          onClick={() => onToggleTaskDone(task.id, !isDone)}
                          className="flex h-3.5 w-3.5 items-center justify-center opacity-40 transition-opacity group-hover/row:opacity-100"
                        >
                          <AnimatedSquareCheckbox
                            checked={isDone}
                            color={isDone ? "#007aff" : "#9ca3af"}
                            className="h-3.5 w-3.5"
                          />
                        </button>
                      </div>

                      <div className="flex min-w-0 items-center py-[9px] pr-3">
                        {editingId === task.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={editingTitle}
                            onChange={(changeEvent) => setEditingTitle(changeEvent.target.value)}
                            onBlur={() => finishEdit(task)}
                            onKeyDown={(keyboardEvent) => {
                              if (keyboardEvent.key === "Enter") {
                                keyboardEvent.preventDefault();
                                finishEdit(task);
                              }
                              if (keyboardEvent.key === "Escape") {
                                keyboardEvent.preventDefault();
                                setEditingId(null);
                                setEditingTitle("");
                              }
                            }}
                            className="w-full border-0 bg-transparent p-0 text-[13px] font-medium text-[#1c1c1e] outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(task)}
                            className={`-mx-1 w-full truncate rounded px-1 text-left text-[13px] font-medium hover:bg-[#f4f5f7] ${isDone ? "text-[#8e8e93] line-through" : "text-[#1c1c1e]"}`}
                          >
                            {task.title}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center py-[9px] pr-3">
                        <TaskPriorityBadge priority={task.priority} />
                      </div>

                      <div className="flex items-center py-[9px] pr-3">
                        <span
                          className="inline-flex h-5 max-w-full items-center truncate rounded-full px-2 text-[11px] font-medium"
                          style={{ backgroundColor: category.bg, color: category.text }}
                        >
                          {category.label}
                        </span>
                      </div>

                      <div className="flex items-center py-[7px] pr-3">
                        <input
                          type="date"
                          value={task.dueDate ?? ""}
                          onChange={(changeEvent) => {
                            onChangeTaskDueDate?.(task.id, changeEvent.target.value || null);
                          }}
                          className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-[12px] text-[#8f929c] outline-none hover:border-[#e5e7eb] hover:bg-white focus:border-[#007aff] focus:bg-white focus:text-[#1c1c1e]"
                        />
                      </div>

                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          aria-label="タスクを削除"
                          onClick={() => onDeleteTask(task.id)}
                          className="flex h-5 w-5 items-center justify-center rounded text-[#c7c7cc] opacity-0 hover:bg-[#fee2e2] hover:text-[#ff3b30] group-hover/row:opacity-100"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          ))
        )}
      </div>
    </div>
  );
};
