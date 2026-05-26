/* eslint-disable react-refresh/only-export-components */
import { DndContext, DragOverlay, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Task } from "@/features/calendar/task/task.types";
import { useTaskBoardDnd } from "./useTaskBoardDnd";

type TaskBoardDndState = ReturnType<typeof useTaskBoardDnd>;

type TaskDndContextProps = Pick<
  TaskBoardDndState,
  | "collisionDetection"
  | "dropAnimation"
  | "handleDragCancel"
  | "handleDragEnd"
  | "handleDragOver"
  | "handleDragStart"
  | "measuring"
  | "sensors"
> & {
  children: ReactNode;
  overlay: ReactNode;
};

type UseTaskDroppableColumnArgs = {
  columnId: string;
};

type TaskSortableContextProps = {
  columnId: string;
  taskIds: string[];
  children: ReactNode;
};

type UseTaskSortableCardArgs = {
  task: Task;
  columnId: string;
};

type UseTaskDroppableSlotArgs = {
  columnId: string;
  insertIndex: number;
  overTaskId?: string | null;
  position?: "before" | "after";
};

export const TaskDndContext = ({
  children,
  collisionDetection,
  dropAnimation,
  handleDragCancel,
  handleDragEnd,
  handleDragOver,
  handleDragStart,
  measuring,
  overlay,
  sensors,
}: TaskDndContextProps) => {
  const dragOverlay = (
    <DragOverlay adjustScale={false} dropAnimation={dropAnimation}>
      {overlay}
    </DragOverlay>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={measuring}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      {children}

      {typeof document === "undefined"
        ? dragOverlay
        : createPortal(dragOverlay, document.body)}
    </DndContext>
  );
};

export const useTaskDroppableColumn = ({ columnId }: UseTaskDroppableColumnArgs) => {
  return useDroppable({
    id: columnId,
    data: {
      type: "column",
      columnId,
    },
  });
};

export const TaskSortableContext = ({
  children,
  columnId,
  taskIds,
}: TaskSortableContextProps) => {
  return (
    <SortableContext
      id={columnId}
      items={taskIds}
      strategy={verticalListSortingStrategy}
    >
      {children}
    </SortableContext>
  );
};

export const useTaskSortableCard = ({ task, columnId }: UseTaskSortableCardArgs) => {
  return useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
      columnId,
      status: task.status,
    },
  });
};

export const useTaskDroppableSlot = ({
  columnId,
  insertIndex,
  overTaskId = null,
  position = "before",
}: UseTaskDroppableSlotArgs) => {
  return useDroppable({
    id: `task-slot:${columnId}:${insertIndex}`,
    data: {
      type: "task-slot",
      columnId,
      insertIndex,
      overTaskId,
      position,
    },
  });
};
