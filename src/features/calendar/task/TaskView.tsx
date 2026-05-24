import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { CATEGORY_CONFIG, TASK_COLUMNS } from "./task.types";
import type { Task, TaskStatus } from "./task.types";
import type { GoogleAccountDisplay } from "../scheduleScreen.types";
import { useTaskStore } from "./hooks/useTaskStore";
import { NewTaskModal } from "../modal/NewTaskModal";
import { type BoardListViewMode } from "../../../chip/toggle/Toggle.boardlist";
import { TaskToolbar } from "../toolbar/TaskToolbar";
import { TaskBoardView } from "../view/TaskBoardView";
import { TaskListView } from "./TaskListView";

// ==============================================

type TaskViewProps = {
  googleAccounts?: GoogleAccountDisplay[];
  selectedTaskListId?: string | null;
  onSelectTaskList?: (taskListId: string | null) => void;
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

const toGoogleTaskCreatedAt = (value?: string, fallback = 0): number => {
  if (!value) return fallback;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? fallback : time;
};

export const TaskView = ({
  googleAccounts = [],
  selectedTaskListId = null,
  onSelectTaskList,
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

  const selectedTaskListMeta = selectedTaskListId
    ? taskListMetaById.get(selectedTaskListId) ?? null
    : null;
  const selectedTaskCategory = selectedTaskListMeta?.category ?? null;

  const taskAccountName = taskAccount?.name ?? taskAccount?.email ?? null;
  const taskAccountPhotoUrl = taskAccount?.photoUrl ?? null;

  const googleTasks = useMemo<Task[]>(() => {
    return googleAccounts.flatMap((account) =>
      account.googleTasks
        .filter((googleTask) => {
          if (!selectedTaskListId) return true;
          return googleTask.taskListId === selectedTaskListId;
        })
        .map((googleTask, index) => {
          const taskListMeta = taskListMetaById.get(googleTask.taskListId);
          const category = taskListMeta?.category ?? googleTask.taskListId;

          return {
            id: `google-task:${account.accountId}:${googleTask.taskListId}:${googleTask.id}`,
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
  }, [googleAccounts, selectedTaskListId, taskListMetaById]);

  const visibleLocalTasks = useMemo(() => {
    if (!selectedTaskCategory) return tasks;
    return tasks.filter((task) => task.category === selectedTaskCategory);
  }, [selectedTaskCategory, tasks]);

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

  const defaultNewTaskCategory = selectedTaskCategory ?? "Programming";

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

  const handleToggleTaskDone = (taskId: string, done: boolean) => {
    if (taskId.startsWith("google-task:")) return;

    let nextStatus: TaskStatus = "not_started";

    if (done) {
      nextStatus = "done";
    }

    moveTask(taskId, nextStatus);
  };

  const handleRenameTask = (taskId: string, title: string) => {
    if (taskId.startsWith("google-task:")) return;
    updateTask(taskId, { title });
  };

  const handleDeleteTask = (taskId: string) => {
    if (taskId.startsWith("google-task:")) return;
    deleteTask(taskId);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <TaskToolbar
        filterDate={filterDate}
        viewMode={viewMode}
        taskListOptions={taskListOptions}
        selectedTaskListId={selectedTaskListId}
        onClearFilterDate={() => setFilterDate(null)}
        onChangeViewMode={setViewMode}
        onSelectTaskList={onSelectTaskList}
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
          onReorderTask={reorderTask}
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
            onSave={addTask}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
