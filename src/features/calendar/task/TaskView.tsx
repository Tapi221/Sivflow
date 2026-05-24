import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { CATEGORY_CONFIG, TASK_COLUMNS } from "./task.types";
import type { Task, TaskCreateInput, TaskStatus } from "./task.types";
import type { GoogleAccountDisplay } from "../scheduleScreen.types";
import { useTaskStore } from "./hooks/useTaskStore";
import { NewTaskModal } from "../modal/NewTaskModal";
import { type BoardListViewMode } from "../../../chip/toggle/Toggle.boardlist";
import { TaskToolbar } from "../toolbar/TaskToolbar";
import { TaskBoardView } from "../view/TaskBoardView";
import { TaskListView } from "./TaskListView";

type GoogleTaskCreateInput = {
  title: string;
  notes?: string | null;
  due?: string | null;
  status?: "needsAction" | "completed";
};

type GoogleTaskPatchInput = {
  title?: string;
  notes?: string | null;
  due?: string | null;
  status?: "needsAction" | "completed";
  completed?: string | null;
};

type TaskViewProps = {
  googleAccounts?: GoogleAccountDisplay[];
  selectedTaskListIds?: string[];
  onRefreshGoogleTasks?: () => Promise<void>;
  onCreateGoogleTask?: (
    taskListId: string,
    input: GoogleTaskCreateInput,
  ) => Promise<unknown>;
  onUpdateGoogleTask?: (
    taskListId: string,
    taskId: string,
    patch: GoogleTaskPatchInput,
  ) => Promise<unknown>;
  onDeleteGoogleTask?: (taskListId: string, taskId: string) => Promise<void>;
};

type TaskCategoryOption = {
  id: string;
  label: string;
};

type GoogleTaskListMeta = {
  id: string;
  label: string;
  category: string;
};

type ParsedGoogleTaskId = {
  taskListId: string;
  taskId: string;
};

const GOOGLE_TASK_ID_PREFIX = "google-task:";

const normalizeTaskListLabel = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s\-_]+/g, "");

const findCategoryByTaskListTitle = (taskListTitle: string): string | null => {
  const normalizedTaskListTitle = normalizeTaskListLabel(taskListTitle);

  return (
    Object.entries(CATEGORY_CONFIG).find(([categoryKey, categoryConfig]) => {
      const candidates = [categoryKey, categoryConfig.label].map(normalizeTaskListLabel);
      return candidates.includes(normalizedTaskListTitle);
    })?.[0] ?? null
  );
};

const toDateOnly = (value?: string): string | null => {
  if (!value) return null;

  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match?.[1] ?? null;
};

const toGoogleDueDate = (value: string | null): string | null => {
  if (!value) return null;
  return `${value}T00:00:00.000Z`;
};

const toGoogleTaskCreatedAt = (value?: string, fallback = 0): number => {
  if (!value) return fallback;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? fallback : time;
};

const toGoogleTaskStatusPatch = (status: TaskStatus): GoogleTaskPatchInput => {
  if (status === "done") {
    return {
      status: "completed",
      completed: new Date().toISOString(),
    };
  }

  return {
    status: "needsAction",
    completed: null,
  };
};

const parseGoogleTaskId = (taskId: string): ParsedGoogleTaskId | null => {
  if (!taskId.startsWith(GOOGLE_TASK_ID_PREFIX)) return null;

  const [, , taskListId, googleTaskId] = taskId.split(":");

  if (!taskListId || !googleTaskId) return null;

  return {
    taskListId,
    taskId: googleTaskId,
  };
};

export const TaskView = ({
  googleAccounts = [],
  selectedTaskListIds = [],
  onRefreshGoogleTasks,
  onCreateGoogleTask,
  onUpdateGoogleTask,
  onDeleteGoogleTask,
}: TaskViewProps) => {
  const { tasks, addTask, deleteTask, moveTask, reorderTask, updateTask } =
    useTaskStore();
  const [viewMode, setViewMode] = useState<BoardListViewMode>("board");
  const [showModal, setShowModal] = useState(false);
  const [newTaskStatus, setNewTaskStatus] =
    useState<TaskStatus>("not_started");
  const [filterDate, setFilterDate] = useState<string | null>(
    format(new Date(), "MMM d"),
  );

  const taskAccount = useMemo(() => {
    return (
      googleAccounts.find((account) => account.photoUrl) ??
      googleAccounts[0] ??
      null
    );
  }, [googleAccounts]);

  const taskListMetaById = useMemo(() => {
    const meta = new Map<string, GoogleTaskListMeta>();

    googleAccounts.forEach((account) => {
      account.taskLists.forEach((taskList) => {
        const category = findCategoryByTaskListTitle(taskList.title) ?? taskList.title;
        const label = CATEGORY_CONFIG[category]?.label ?? taskList.title;
        meta.set(taskList.id, { id: taskList.id, label, category });
      });
    });

    return meta;
  }, [googleAccounts]);

  const taskListOptions = useMemo<TaskCategoryOption[]>(() => {
    return Array.from(taskListMetaById.values(), ({ id, label }) => ({ id, label }));
  }, [taskListMetaById]);

  const selectedTaskListIdSet = useMemo(
    () => new Set(selectedTaskListIds),
    [selectedTaskListIds],
  );

  const selectedTaskCategories = useMemo(() => {
    return new Set(
      selectedTaskListIds
        .map((id) => taskListMetaById.get(id)?.category)
        .filter((category): category is string => Boolean(category)),
    );
  }, [selectedTaskListIds, taskListMetaById]);

  const selectedTaskListIdForCreate = selectedTaskListIds.length === 1
    ? selectedTaskListIds[0]
    : null;
  const defaultNewTaskCategory = selectedTaskListIdForCreate
    ? taskListMetaById.get(selectedTaskListIdForCreate)?.category ?? "Programming"
    : "Programming";

  const taskAccountName = taskAccount?.name ?? taskAccount?.email ?? null;
  const taskAccountPhotoUrl = taskAccount?.photoUrl ?? null;

  const googleTasks = useMemo<Task[]>(() => {
    return googleAccounts.flatMap((account) =>
      account.googleTasks
        .filter((googleTask) => selectedTaskListIdSet.has(googleTask.taskListId))
        .map((googleTask, index) => {
          const taskListMeta = taskListMetaById.get(googleTask.taskListId);
          const category = taskListMeta?.category ?? googleTask.taskListId;

          return {
            id: `${GOOGLE_TASK_ID_PREFIX}${account.accountId}:${googleTask.taskListId}:${googleTask.id}`,
            title: googleTask.title,
            status: googleTask.status === "completed" ? "done" : "not_started",
            priority: "medium",
            category,
            dueDate: toDateOnly(googleTask.due),
            assignee: account.email ? account.email.slice(0, 1).toUpperCase() : "G",
            createdAt: toGoogleTaskCreatedAt(googleTask.updated, index),
            scheduledStart: null,
            scheduledEnd: null,
            googleCalendarId: null,
            googleEventId: googleTask.id,
          } satisfies Task;
        }),
    );
  }, [googleAccounts, selectedTaskListIdSet, taskListMetaById]);

  const visibleLocalTasks = useMemo(() => {
    if (selectedTaskCategories.size === 0) return [];
    return tasks.filter((task) => selectedTaskCategories.has(task.category));
  }, [selectedTaskCategories, tasks]);

  const visibleTasks = useMemo(() => {
    return [...visibleLocalTasks, ...googleTasks];
  }, [googleTasks, visibleLocalTasks]);

  const tasksByStatus = useMemo(() => {
    return TASK_COLUMNS.reduce(
      (acc, col) => {
        acc[col.id] = visibleTasks.filter((task) => task.status === col.id);
        return acc;
      },
      {} as Record<TaskStatus, Task[]>,
    );
  }, [visibleTasks]);

  const categoryOptions = useMemo<TaskCategoryOption[]>(() => {
    const options = new Map<string, string>();

    taskListMetaById.forEach(({ category, label }) => {
      options.set(category, CATEGORY_CONFIG[category]?.label ?? label);
    });

    Object.entries(CATEGORY_CONFIG).forEach(([category, config]) => {
      options.set(category, config.label);
    });

    return Array.from(options, ([id, label]) => ({ id, label }));
  }, [taskListMetaById]);

  const handleAddTask = (status: string) => {
    setNewTaskStatus(status as TaskStatus);
    setShowModal(true);
  };

  const handleOpenNewTaskModal = () => {
    setNewTaskStatus("not_started");
    setShowModal(true);
  };

  const handleSaveTask = async (data: TaskCreateInput) => {
    if (selectedTaskListIdForCreate && onCreateGoogleTask) {
      await onCreateGoogleTask(selectedTaskListIdForCreate, {
        title: data.title,
        due: toGoogleDueDate(data.dueDate),
        status: data.status === "done" ? "completed" : "needsAction",
      });
      await onRefreshGoogleTasks?.();
      return;
    }

    addTask(data);
  };

  const handleToggleTaskDone = (taskId: string, done: boolean) => {
    const googleTaskId = parseGoogleTaskId(taskId);

    if (googleTaskId) {
      void onUpdateGoogleTask?.(
        googleTaskId.taskListId,
        googleTaskId.taskId,
        done
          ? { status: "completed", completed: new Date().toISOString() }
          : { status: "needsAction", completed: null },
      ).then(() => onRefreshGoogleTasks?.());
      return;
    }

    moveTask(taskId, done ? "done" : "not_started");
  };

  const handleRenameTask = (taskId: string, title: string) => {
    const googleTaskId = parseGoogleTaskId(taskId);

    if (googleTaskId) {
      void onUpdateGoogleTask?.(googleTaskId.taskListId, googleTaskId.taskId, {
        title,
      }).then(() => onRefreshGoogleTasks?.());
      return;
    }

    updateTask(taskId, { title });
  };

  const handleDeleteTask = (taskId: string) => {
    const googleTaskId = parseGoogleTaskId(taskId);

    if (googleTaskId) {
      void onDeleteGoogleTask?.(
        googleTaskId.taskListId,
        googleTaskId.taskId,
      ).then(() => onRefreshGoogleTasks?.());
      return;
    }

    deleteTask(taskId);
  };

  const handleReorderTask = (
    taskId: string,
    status: TaskStatus,
    overTaskId?: string | null,
    position?: "before" | "after",
  ) => {
    const googleTaskId = parseGoogleTaskId(taskId);

    if (googleTaskId) {
      void onUpdateGoogleTask?.(
        googleTaskId.taskListId,
        googleTaskId.taskId,
        toGoogleTaskStatusPatch(status),
      ).then(() => onRefreshGoogleTasks?.());
      return;
    }

    reorderTask(taskId, status, overTaskId, position);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <TaskToolbar
        filterDate={filterDate}
        viewMode={viewMode}
        taskListOptions={taskListOptions}
        selectedTaskListIds={selectedTaskListIds}
        onClearFilterDate={() => setFilterDate(null)}
        onChangeViewMode={setViewMode}
        onOpenNewTaskModal={handleOpenNewTaskModal}
      />

      {viewMode === "board" ? (
        <TaskBoardView
          tasksByStatus={tasksByStatus}
          accountName={taskAccountName}
          accountPhotoUrl={taskAccountPhotoUrl}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onToggleTaskDone={handleToggleTaskDone}
          onReorderTask={handleReorderTask}
        />
      ) : (
        <TaskListView
          tasks={visibleTasks}
          onToggleTaskDone={handleToggleTaskDone}
          onRenameTask={handleRenameTask}
          onDeleteTask={handleDeleteTask}
        />
      )}

      <AnimatePresence>
        {showModal && (
          <NewTaskModal
            key="new-task-modal"
            defaultStatus={newTaskStatus}
            defaultCategory={defaultNewTaskCategory}
            categoryOptions={categoryOptions}
            onClose={() => setShowModal(false)}
            onSave={handleSaveTask}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
