import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { TASK_COLUMNS } from "./task.types";
import type { TaskStatus } from "./task.types";
import type { GoogleAccountDisplay } from "../schedulePane.types";
import { useTaskStore } from "./hooks/useTaskStore";
import { NewTaskModal } from "../modal/NewTaskModal";
import { type BoardListViewMode } from "../chip/toggle/Toggle.boardlist";
import { TaskToolbar } from "../toolbar/TaskToolbar";
import { TaskBoardView } from "./TaskBoardView";
import { TaskListView } from "./TaskListView";

// ==============================================

type TaskViewProps = {
  googleAccounts?: GoogleAccountDisplay[];
};

export const TaskView = ({ googleAccounts = [] }: TaskViewProps) => {
  const { tasks, addTask, deleteTask, moveTask, reorderTask } = useTaskStore();
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

  const taskAccountName = taskAccount?.name ?? taskAccount?.email ?? null;
  const taskAccountPhotoUrl = taskAccount?.photoUrl ?? null;

  const tasksByStatus = useMemo(() => {
    return TASK_COLUMNS.reduce(
      (acc, col) => {
        acc[col.id] = tasks.filter((task) => task.status === col.id);
        return acc;
      },
      {} as Record<TaskStatus, typeof tasks>,
    );
  }, [tasks]);

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

  return (
    <div
      className={`flex h-full min-h-0 flex-col ${
        viewMode === "board" ? "bg-[#f7f8fa]" : "bg-white"
      }`}
    >
      <TaskToolbar
        filterDate={filterDate}
        viewMode={viewMode}
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
          onDeleteTask={deleteTask}
          onToggleTaskDone={handleToggleTaskDone}
          onReorderTask={reorderTask}
        />
      ) : (
        <TaskListView tasks={tasks} onToggleTaskDone={handleToggleTaskDone} />
      )}

      <AnimatePresence>
        {showModal && (
          <NewTaskModal
            key="new-task-modal"
            defaultStatus={newTaskStatus}
            onClose={() => setShowModal(false)}
            onSave={addTask}
          />
        )}
      </AnimatePresence>
    </div>
  );
};