import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { TASK_COLUMNS } from "./task.types";
import type { TaskStatus } from "./task.types";
import { useTaskStore } from "./useTaskStore";
import { NewTaskModal } from "../modal/NewTaskModal";
import { type BoardListViewMode } from "../chip/BoardListToggleButton";
import { TaskToolbar } from "../toolbar/TaskToolbar";
import { TaskBoardView } from "./TaskBoardView";
import { TaskListView } from "./TaskListView";

// ==============================================

export const TaskView = () => {
  const { tasks, addTask, deleteTask, moveTask } = useTaskStore();
  const [viewMode, setViewMode] = useState<BoardListViewMode>("board");
  const [showModal, setShowModal] = useState(false);
  const [newTaskStatus, setNewTaskStatus] =
    useState<TaskStatus>("not_started");
  const [filterDate, setFilterDate] = useState<string | null>(
    format(new Date(), "MMM d"),
  );

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
    <div className="flex h-full min-h-0 flex-col bg-white">
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
          onAddTask={handleAddTask}
          onDeleteTask={deleteTask}
          onToggleTaskDone={handleToggleTaskDone}
        />
      ) : (
        <TaskListView tasks={tasks} />
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