import { TASK_COLUMNS } from "./task.types";
import type { Task, TaskStatus } from "./task.types";
import { TaskColumn } from "./TaskColumn";

type TaskBoardViewProps = {
  tasksByStatus: Record<TaskStatus, Task[]>;
  onAddTask: (status: string) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTaskDone: (taskId: string, done: boolean) => void;
};

export const TaskBoardView = ({
  tasksByStatus,
  onAddTask,
  onDeleteTask,
  onToggleTaskDone,
}: TaskBoardViewProps) => {
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-auto p-4">
      {TASK_COLUMNS.map((col) => (
        <TaskColumn
          key={col.id}
          column={col}
          tasks={tasksByStatus[col.id] ?? []}
          onAddTask={onAddTask}
          onDeleteTask={onDeleteTask}
          onToggleTaskDone={onToggleTaskDone}
        />
      ))}
    </div>
  );
};