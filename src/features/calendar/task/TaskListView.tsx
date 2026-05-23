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
import { cn } from "@/lib/utils";
import { TASK_COLUMNS, CATEGORY_CONFIG, PRIORITY_CONFIG } from "./task.types";
import type { Task, TaskStatus } from "./task.types";
import { TaskStatusDot } from "../../../chip/icon/TaskStatusDot";

type TaskListViewProps = {
  tasks: Task[];
  onToggleTaskDone: (taskId: string, done: boolean) => void;
  onRenameTask: (taskId: string, title: string) => void;
};

// ── カラム定義 ──────────────────────────────────────────────

type ColId = "done" | "title" | "priority" | "category" | "dueDate";

type ColDef = {
  id: ColId;
  label: string;
  width: number;
  minWidth: number;
  maxWidth?: number;
  resizable: boolean;
};

const STORAGE_KEY = "task-list-view:col-widths:v2";

const DEFAULT_COLS: ColDef[] = [
  { id: "done",     label: "",         width: 32,  minWidth: 32,  maxWidth: 32,  resizable: false },
  { id: "title",    label: "タイトル", width: 480, minWidth: 160,               resizable: true  },
  { id: "priority", label: "優先度",   width: 96,  minWidth: 72,  maxWidth: 160, resizable: true  },
  { id: "category", label: "カテゴリ", width: 160, minWidth: 100, maxWidth: 260, resizable: true  },
  { id: "dueDate",  label: "期日",     width: 120, minWidth: 80,  maxWidth: 180, resizable: true  },
];

const clamp = (v: number, min: number, max?: number) =>
  max !== undefined ? Math.min(Math.max(v, min), max) : Math.max(v, min);

const loadCols = (): ColDef[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COLS;
    const stored = JSON.parse(raw) as Partial<Record<ColId, number>>;
    return DEFAULT_COLS.map((c) => {
      const w = stored[c.id];
      return typeof w === "number" ? { ...c, width: clamp(w, c.minWidth, c.maxWidth) } : c;
    });
  } catch {
    return DEFAULT_COLS;
  }
};

// ── ステータスごとのラベル・カラー ──────────────────────────

const STATUS_META: Record<TaskStatus, { label: string; color: string; dot: string }> = {
  not_started: { label: "未着手",  color: "#8f929c", dot: "#d1d5db" },
  in_progress: { label: "進行中",  color: "#185FA5", dot: "#185FA5" },
  review:      { label: "レビュー",color: "#d97706", dot: "#f59e0b" },
  done:        { label: "完了",    color: "#16a34a", dot: "#22c55e" },
};

// ── リサイズハンドル ────────────────────────────────────────

type ResizeHandleProps = {
  colId: ColId;
  onStart: (e: ReactPointerEvent<HTMLDivElement>, id: ColId) => void;
  onReset: (id: ColId) => void;
};

const ResizeHandle = ({ colId, onStart, onReset }: ResizeHandleProps) => (
  <div
    role="separator"
    aria-orientation="vertical"
    className="absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none select-none flex items-center justify-center z-10 group/rh"
    onDoubleClick={() => onReset(colId)}
    onPointerDown={(e) => onStart(e, colId)}
  >
    <div className="w-px h-4 bg-[#e5e7eb] group-hover/rh:bg-[#c8cbd1] transition-colors" />
  </div>
);

// ── セクションヘッダー ──────────────────────────────────────

type SectionHeaderProps = {
  status: TaskStatus;
  count: number;
  open: boolean;
  onToggle: () => void;
  onAdd: () => void;
  cols: ColDef[];
};

const SectionHeader = ({ status, count, open, onToggle, onAdd, cols }: SectionHeaderProps) => {
  const meta = STATUS_META[status];
  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: cols.map((c) => `${c.width}px`).join(" "),
  };

  return (
    <div
      className="sticky top-0 z-10 bg-white border-b border-[#f0f0f0] group/sh"
      style={gridStyle}
    >
      {/* done cell */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          aria-label={open ? "セクションを閉じる" : "セクションを開く"}
          onClick={onToggle}
          className="flex items-center justify-center w-4 h-4 rounded text-[#b0b4be] hover:text-[#6b7280] transition-colors"
        >
          <svg
            viewBox="0 0 10 10"
            className="w-2.5 h-2.5 transition-transform duration-150"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
      </div>

      {/* title cell */}
      <div className="flex items-center gap-2 py-2 pr-3">
        <TaskStatusDot color={meta.dot} />
        <span
          className="text-[12px] font-semibold tracking-[0.02em] select-none"
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>
        <span className="text-[11px] font-medium text-[#b0b4be] tabular-nums select-none">
          {count}
        </span>
      </div>

      {/* remaining cells are empty */}
      {cols.slice(2).map((c) => (
        <div key={c.id} className="py-2" />
      ))}
    </div>
  );
};

// ── 行コンポーネント ────────────────────────────────────────

type RowProps = {
  task: Task;
  cols: ColDef[];
  isEditing: boolean;
  editingTitle: string;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  onToggleDone: (id: string, done: boolean) => void;
  onStartEdit: (task: Task) => void;
  onFinishEdit: (task: Task) => void;
  onCancelEdit: () => void;
  onEditingChange: (v: string) => void;
  onDelete: (id: string) => void;
};

const Row = ({
  task,
  cols,
  isEditing,
  editingTitle,
  titleInputRef,
  onToggleDone,
  onStartEdit,
  onFinishEdit,
  onCancelEdit,
  onEditingChange,
  onDelete,
}: RowProps) => {
  const isDone = task.status === "done";
  const category = CATEGORY_CONFIG[task.category] ?? { label: task.category, bg: "#f3f4f6", text: "#6b7280" };
  const priority = PRIORITY_CONFIG[task.priority];
  const dueLabel = task.dueDate ? format(new Date(task.dueDate), "MMM d") : null;

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: cols.map((c) => `${c.width}px`).join(" "),
  };

  return (
    <div
      className={cn(
        "group/row border-b border-[#f5f5f5] hover:bg-[#fafafa] transition-colors duration-75",
        isDone && "opacity-50",
      )}
      style={gridStyle}
    >
      {/* done */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          aria-label={isDone ? "未完了に戻す" : "完了にする"}
          onClick={() => onToggleDone(task.id, !isDone)}
          className="flex items-center justify-center w-3.5 h-3.5 opacity-40 group-hover/row:opacity-100 transition-opacity"
        >
          <AnimatedSquareCheckbox checked={isDone} color={isDone ? "#007aff" : "#9ca3af"} className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* title */}
      <div className="flex items-center min-w-0 pr-3 py-[9px]">
        {isEditing ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editingTitle}
            onChange={(e) => onEditingChange(e.target.value)}
            onBlur={() => onFinishEdit(task)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); onFinishEdit(task); }
              if (e.key === "Escape") { e.preventDefault(); onCancelEdit(); }
            }}
            className="w-full bg-transparent border-0 outline-none text-[13px] font-medium text-[#1c1c1e] placeholder:text-[#c7c7cc] p-0 leading-snug"
          />
        ) : (
          <button
            type="button"
            onClick={() => onStartEdit(task)}
            className={cn(
              "w-full text-left text-[13px] font-medium leading-snug truncate rounded hover:bg-[#f4f5f7] px-1 -mx-1 transition-colors",
              isDone ? "text-[#8e8e93] line-through decoration-[#c7c7cc]" : "text-[#1c1c1e]",
            )}
          >
            {task.title}
          </button>
        )}

        {/* 削除ボタン - hover時のみ */}
        <button
          type="button"
          aria-label="削除"
          onClick={() => onDelete(task.id)}
          className="ml-2 flex-shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity text-[#c7c7cc] hover:text-[#ff3b30]"
        >
          <svg viewBox="0 0 14 14" className="w-3.5 h-3.5">
            <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* priority */}
      <div className="flex items-center py-[9px] pr-3">
        <span
          className="inline-flex items-center h-5 rounded-full px-2 text-[11px] font-medium"
          style={{ backgroundColor: priority.bg, color: priority.text }}
        >
          {priority.label}
        </span>
      </div>

      {/* category */}
      <div className="flex items-center py-[9px] pr-3">
        <span
          className="inline-flex items-center h-5 rounded-full px-2 text-[11px] font-medium truncate max-w-full"
          style={{ backgroundColor: category.bg, color: category.text }}
        >
          {category.label}
        </span>
      </div>

      {/* dueDate */}
      <div className="flex items-center py-[9px] pr-3">
        {dueLabel && (
          <span className="text-[12px] tabular-nums text-[#8f929c]">{dueLabel}</span>
        )}
      </div>
    </div>
  );
};

// ── メインコンポーネント ────────────────────────────────────

export const TaskListView = ({ tasks, onToggleTaskDone, onRenameTask }: TaskListViewProps) => {
  const t = useT();
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  const [cols, setCols] = useState<ColDef[]>(loadCols);
  const [isResizing, setIsResizing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [closedSections, setClosedSections] = useState<Set<TaskStatus>>(new Set());

  // カラム幅を localStorage に永続化
  useEffect(() => {
    const map = Object.fromEntries(cols.map((c) => [c.id, c.width]));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }, [cols]);

  // リサイズ中はカーソルを固定
  useEffect(() => {
    if (!isResizing) return;
    const prev = { cursor: document.body.style.cursor, select: document.body.style.userSelect };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = prev.cursor;
      document.body.style.userSelect = prev.select;
    };
  }, [isResizing]);

  // 編集開始時にフォーカス
  useEffect(() => {
    if (editingId) titleInputRef.current?.focus();
  }, [editingId]);

  // クリーンアップ
  useEffect(() => () => { resizeCleanupRef.current?.(); }, []);

  // ステータス順にグループ化
  const grouped = useMemo(() => {
    return TASK_COLUMNS.map((col) => ({
      status: col.id as TaskStatus,
      tasks: tasks.filter((t) => t.status === col.id),
    }));
  }, [tasks]);

  const gridMinWidth = useMemo(() => cols.reduce((s, c) => s + c.width, 0), [cols]);
  const gridTemplate = useMemo(() => cols.map((c) => `${c.width}px`).join(" "), [cols]);

  // リサイズ開始
  const handleResizeStart = (e: ReactPointerEvent<HTMLDivElement>, colId: ColId) => {
    const target = cols.find((c) => c.id === colId);
    if (!target?.resizable) return;
    resizeCleanupRef.current?.();
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startW = target.width;
    setIsResizing(true);

    const onMove = (ev: PointerEvent) => {
      setCols((prev) => prev.map((c) =>
        c.id !== colId ? c : { ...c, width: clamp(startW + ev.clientX - startX, c.minWidth, c.maxWidth) }
      ));
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setIsResizing(false);
      resizeCleanupRef.current = null;
    };
    const onUp = () => cleanup();
    resizeCleanupRef.current = cleanup;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const handleResizeReset = (colId: ColId) => {
    const def = DEFAULT_COLS.find((c) => c.id === colId);
    if (!def) return;
    setCols((prev) => prev.map((c) => c.id === colId ? { ...c, width: def.width } : c));
  };

  // タイトル編集
  const startEdit = (task: Task) => { setEditingId(task.id); setEditingTitle(task.title); };
  const finishEdit = (task: Task) => {
    const next = editingTitle.trim();
    if (next && next !== task.title) onRenameTask(task.id, next);
    setEditingId(null); setEditingTitle("");
  };
  const cancelEdit = () => { setEditingId(null); setEditingTitle(""); };

  const toggleSection = (status: TaskStatus) => {
    setClosedSections((prev) => {
      const next = new Set(prev);
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-white">
      {/* テーブルヘッダー */}
      <div
        className="sticky top-0 z-20 bg-white border-b border-[#eeeeee]"
        style={{ minWidth: `${gridMinWidth}px` }}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {/* done */}
          <div className="h-8" />

          {/* title */}
          <div className="relative flex items-center h-8 pr-3 text-[11px] font-semibold text-[#8f929c] tracking-[0.04em] uppercase">
            タイトル
            <ResizeHandle colId="title" onStart={handleResizeStart} onReset={handleResizeReset} />
          </div>

          {/* priority */}
          <div className="relative flex items-center h-8 pr-3 text-[11px] font-semibold text-[#8f929c] tracking-[0.04em] uppercase">
            優先度
            <ResizeHandle colId="priority" onStart={handleResizeStart} onReset={handleResizeReset} />
          </div>

          {/* category */}
          <div className="relative flex items-center h-8 pr-3 text-[11px] font-semibold text-[#8f929c] tracking-[0.04em] uppercase">
            カテゴリ
            <ResizeHandle colId="category" onStart={handleResizeStart} onReset={handleResizeReset} />
          </div>

          {/* dueDate */}
          <div className="relative flex items-center h-8 pr-3 text-[11px] font-semibold text-[#8f929c] tracking-[0.04em] uppercase">
            期日
          </div>
        </div>
      </div>

      {/* グループ別行 */}
      <div style={{ minWidth: `${gridMinWidth}px` }}>
        {grouped.map(({ status, tasks: groupTasks }) => {
          const isOpen = !closedSections.has(status);
          return (
            <div key={status}>
              <SectionHeader
                status={status}
                count={groupTasks.length}
                open={isOpen}
                onToggle={() => toggleSection(status)}
                onAdd={() => {}}
                cols={cols}
              />

              {isOpen && groupTasks.map((task) => (
                <Row
                  key={task.id}
                  task={task}
                  cols={cols}
                  isEditing={editingId === task.id}
                  editingTitle={editingTitle}
                  titleInputRef={titleInputRef}
                  onToggleDone={onToggleTaskDone}
                  onStartEdit={startEdit}
                  onFinishEdit={finishEdit}
                  onCancelEdit={cancelEdit}
                  onEditingChange={setEditingTitle}
                  onDelete={() => {}}
                />
              ))}

              {isOpen && groupTasks.length === 0 && (
                <div
                  className="grid border-b border-[#f5f5f5]"
                  style={{ gridTemplateColumns: cols.map((c) => `${c.width}px`).join(" ") }}
                >
                  <div />
                  <div className="py-2 pr-3 text-[12px] text-[#c7c7cc] italic">
                    タスクなし
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};