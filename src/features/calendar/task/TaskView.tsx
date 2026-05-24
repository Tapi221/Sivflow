import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { CATEGORY_CONFIG, TASK_COLUMNS } from "./task.types";
import type { TaskStatus } from "./task.types";
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

  const taskListOptions = useMemo<TaskCategoryOption[]>(() => {
    const options = new Map<string, string>();

    googleAccounts.forEach((account) => {
      account.taskLists.forEach((taskList) => {
        const category = findCategoryByTaskListTitle(taskList.title) ?? taskList.title;
        const label = CATEGORY_CONFIG[category]?.label ?? taskList.title;
        options.set(taskList.id, label);
      });
    });

    return Array.from(options, ([id, label]) => ({ id, label }));
  }, [googleAccounts]);

  const selectedTaskList = useMemo(() => {
    if (!selectedTaskListId) return null;

    for (const account of googleAccounts) {
      const taskList = account.taskLists.find((item) => item.id === selectedTaskListId);
      if (taskList) return taskList;
    }

    return null;
  }, [googleAccounts, selectedTaskListId]);

  const selectedTaskCategory = useMemo(() => {
    if (!selectedTaskList) return null;
    return findCategoryByTaskListTitle(selectedTaskList.title) ?? selectedTaskList.title;
  }, [selectedTaskList]);

  const taskAccountName = taskAccount?.name ?? taskAccount?.email ?? null;
  const taskAccountPhotoUrl = taskAccount?.photoUrl ?? null;

  const visibleTasks = useMemo(() => {
    if (!selectedTaskCategory) return tasks;
    return tasks.filter((task) => task.category === selectedTaskCategory);
  }, [selectedTaskCategory, tasks]);

  const tasksByStatus = useMemo(() => {
    return TASK_COLUMNS.reduce(
      (acc, col) => {
        acc[col.id] = visibleTasks.filter((task) => task.status === col.id);
        return acc;
      },
      {} as Record<TaskStatus, typeof tasks>,
    );
  }, [visibleTasks]);

  const defaultNewTaskCategory = selectedTaskCategory ?? "Programming";

  const categoryOptions = useMemo<TaskCategoryOption[]>(() => {
    const options = new Map<string, string>();

    taskListOptions.forEach((option) => {
      const taskList = googleAccounts
        .flatMap((account) => account.taskLists)
        .find((item) => item.id === option.id);
      const category = taskList
        ? findCategoryByTaskListTitle(taskList.title) ?? taskList.title
        : option.label;
      options.set(category, CATEGORY_CONFIG[category]?.label ?? option.label);
    });

    Object.entries(CATEGORY_CONFIG).forEach(([category, config]) => {
      options.set(category, config.label);
    });

    return Array.from(options, ([id, label]) => ({ id, label }));
  }, [googleAccounts, taskListOptions]);

  const handleAddTask = (status: string) => {
    setNewTaskStatus(status as TaskStatus);
    setShowModal(true);
  };

  const handleOpenNewTaskModal = () => {
    setNewTaskStatus("not_started");
    setShowModal(true);
  };

  const handleToggleTaskDone = (taskId: string, done: boolean) => {
    let nextStatus: TaskStatus = "not_started";

    if (done) {
      nextStatus = "done";
    }

    moveTask(taskId, nextStatus);
  };

  const handleRenameTask = (taskId: string, title: string) => {
    updateTask(taskId, { title });
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
          onDeleteTask={deleteTask}
          onToggleTaskDone={handleToggleTaskDone}
          onReorderTask={reorderTask}
        />
      ) : (
        <TaskListView
          tasks={visibleTasks}
          onToggleTaskDone={handleToggleTaskDone}
          onRenameTask={handleRenameTask}
          onDeleteTask={deleteTask}
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
