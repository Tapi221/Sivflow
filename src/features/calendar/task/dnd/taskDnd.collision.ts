import {
  closestCorners,
  type CollisionDetection,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";

import { isTaskStatus } from "./taskDnd.preview";
import type {
  CollisionDescriptor,
  CollisionDetectionArgs,
} from "./taskDnd.types";

const getActiveMiddleY = (args: CollisionDetectionArgs): number => {
  const activeRect = args.collisionRect;
  return activeRect.top + activeRect.height / 2;
};

const getNearestSlotCollision = (
  args: CollisionDetectionArgs,
  slotContainers: CollisionDetectionArgs["droppableContainers"],
): CollisionDescriptor[] => {
  const activeMiddleY = getActiveMiddleY(args);

  const slotCollisions = slotContainers
    .map((container): CollisionDescriptor | null => {
      const rect = args.droppableRects.get(container.id);

      if (!rect) {
        return null;
      }

      const centerY = rect.top + rect.height / 2;

      return {
        id: container.id,
        data: {
          droppableContainer: container,
          value: Math.abs(activeMiddleY - centerY),
        },
      };
    })
    .filter((collision): collision is CollisionDescriptor => collision !== null)
    .sort((left, right) => left.data.value - right.data.value);

  return slotCollisions.slice(0, 1);
};

export const taskBoardCollisionDetection: CollisionDetection = (args) => {
  const columnContainers = args.droppableContainers.filter(
    (container) => container.data.current?.type === "column",
  );
  const taskContainers = args.droppableContainers.filter(
    (container) => container.data.current?.type === "task",
  );
  const slotContainers = args.droppableContainers.filter(
    (container) => container.data.current?.type === "task-slot",
  );

  const pointerColumnCollisions = pointerWithin({
    ...args,
    droppableContainers: columnContainers,
  });
  const columnCollisions =
    pointerColumnCollisions.length > 0
      ? pointerColumnCollisions
      : rectIntersection({
        ...args,
        droppableContainers: columnContainers,
      });

  const overColumn = columnContainers.find(
    (container) => container.id === columnCollisions[0]?.id,
  );
  const overStatus = overColumn?.data.current?.status;

  if (isTaskStatus(overStatus)) {
    const targetColumnSlots = slotContainers.filter(
      (container) => container.data.current?.status === overStatus,
    );

    if (targetColumnSlots.length > 0) {
      return getNearestSlotCollision(args, targetColumnSlots);
    }

    return columnCollisions;
  }

  const taskCollisions = closestCorners({
    ...args,
    droppableContainers: taskContainers,
  });

  return taskCollisions.length > 0 ? taskCollisions : closestCorners(args);
};
