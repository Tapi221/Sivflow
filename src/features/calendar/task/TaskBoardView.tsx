import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { TASK_COLUMNS } from "./task.types";
import type { Task, TaskStatus } from "./task.types";
import { TaskColumn } from "./TaskColumn";

type TaskBoardViewProps = {
  tasksByStatus: Record<TaskStatus, Task[]>;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  onAddTask: (status: string) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTaskDone: (taskId: string, done: boolean) => void;
  onReorderTask: (
    taskId: string,
    status: TaskStatus,
    overTaskId?: string | null,
    position?: "before" | "after",
  ) => void;
};

type DroppableTaskColumnProps = Omit<TaskBoardViewProps, "tasksByStatus" | "onReorderTask"> & {
  column: (typeof TASK_COLUMNS)[number];
  tasks: Task[];
};

const DroppableTaskColumn = ({
  column,
  tasks,
  accountName,
  accountPhotoUrl,
  onAddTask,
  onDeleteTask,
  onToggleTaskDone,
}: DroppableTaskColumnProps) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      status: column.id,
    },
  });

  return (
    <div ref={setNodeRef} className="flex h-full min-h-0 min-w-[260px] flex-1">
      <TaskColumn
        column={column}
        tasks={tasks}
        accountName={accountName}
        accountPhotoUrl={accountPhotoUrl}
        onAddTask={onAddTask}
        onDeleteTask={onDeleteTask}
        onToggleTaskDone={onToggleTaskDone}
      />
    </div>
  );
};

const findTask = (
  tasksByStatus: Record<TaskStatus, Task[]>,
  taskId: string,
): Task | null => {
  for (const column of TASK_COLUMNS) {
    const task = tasksByStatus[column.id]?.find((item) => item.id === taskId);

    if (task) {
      return task;
    }
  }

  return null;
};

const isTaskStatus = (value: unknown): value is TaskStatus => {
  return TASK_COLUMNS.some((column) => column.id === value);
};

export const TaskBoardView = ({
  tasksByStatus,
  accountName,
  accountPhotoUrl,
  onAddTask,
  onDeleteTask,
  onToggleTaskDone,
  onReorderTask,
}: TaskBoardViewProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragOver = (event: DragOverEvent) => {
    const activeId = String(event.active.id);
    const over = event.over;

    if (!over) {
      return;
    }

    const activeTask = findTask(tasksByStatus, activeId);

    if (!activeTask) {
      return;
    }

    const overType = over.data.current?.type;
    const overStatus = over.data.current?.status;

    if (overType === "column" && isTaskStatus(overStatus) && activeTask.status !== overStatus) {
      onReorderTask(activeId, overStatus);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const over = event.over;

    if (!over) {
      return;
    }

    const activeTask = findTask(tasksByStatus, activeId);

    if (!activeTask) {
      return;
    }

    const overType = over.data.current?.type;
    const overStatus = over.data.current?.status;

    if (overType === "column" && isTaskStatus(overStatus)) {
      onReorderTask(activeId, overStatus);
      return;
    }

    const overId = String(over.id);
    const overTask = findTask(tasksByStatus, overId);

    if (!overTask || overId === activeId) {
      return;
    }

    const activeRectTop = event.active.rect.current.translated?.top ?? event.active.rect.current.initial?.top ?? 0;
    const overRectTop = over.rect?.top ?? 0;
    const position = activeRectTop > overRectTop ? "after" : "before";

    onReorderTask(activeId, overTask.status, overId, position);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pt-4 pb-0">
        <div className="flex h-full min-h-0 gap-3">
          {TASK_COLUMNS.map((col) => (
            <DroppableTaskColumn
              key={col.id}
              column={col}
              tasks={tasksByStatus[col.id] ?? []}
              accountName={accountName}
              accountPhotoUrl={accountPhotoUrl}
              onAddTask={onAddTask}
              onDeleteTask={onDeleteTask}
              onToggleTaskDone={onToggleTaskDone}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
};