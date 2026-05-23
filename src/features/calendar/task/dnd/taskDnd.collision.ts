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

const getPointerTaskCollisions = (
  args: CollisionDetectionArgs,
  taskContainers: CollisionDetectionArgs["droppableContainers"],
): CollisionDescriptor[] => {
  const { pointerCoordinates } = args;

  if (!pointerCoordinates) {
    return closestCorners({
      ...args,
      droppableContainers: taskContainers,
    });
  }

  return taskContainers
    .map((container): CollisionDescriptor | null => {
      const rect = args.droppableRects.get(container.id);

      if (!rect) {
        return null;
      }

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const outsideTop = Math.max(0, rect.top - pointerCoordinates.y);
      const outsideBottom = Math.max(
        0,
        pointerCoordinates.y - (rect.top + rect.height),
      );
      const verticalDistance = Math.abs(pointerCoordinates.y - centerY);
      const horizontalDistance = Math.abs(pointerCoordinates.x - centerX);
      const value =
        (outsideTop + outsideBottom) * 4 + verticalDistance + horizontalDistance * 0.01;

      return {
        id: container.id,
        data: {
          droppableContainer: container,
          value,
        },
      };
    })
    .filter((collision): collision is CollisionDescriptor => collision !== null)
    .sort((left, right) => left.data.value - right.data.value);
};

export const taskBoardCollisionDetection: CollisionDetection = (args) => {
  const activeId = args.active.id;
  const columnContainers = args.droppableContainers.filter(
    (container) => container.data.current?.type === "column",
  );
  const taskContainers = args.droppableContainers.filter(
    (container) =>
      container.id !== activeId && container.data.current?.type === "task",
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
    const targetColumnTasks = taskContainers.filter(
      (container) => container.data.current?.status === overStatus,
    );

    if (targetColumnTasks.length > 0) {
      return getPointerTaskCollisions(args, targetColumnTasks);
    }

    return columnCollisions;
  }

  const taskCollisions = getPointerTaskCollisions(args, taskContainers);

  return taskCollisions.length > 0 ? taskCollisions : closestCorners(args);
};
