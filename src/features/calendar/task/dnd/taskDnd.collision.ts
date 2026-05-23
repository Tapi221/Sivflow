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

const getPointerTaskCollisions = (
  args: CollisionDetectionArgs,
  taskContainers: CollisionDetectionArgs["droppableContainers"],
): CollisionDescriptor[] => {
  const activeMiddleY = getActiveMiddleY(args);

  const orderedTaskRects = taskContainers
    .map((container) => {
      const rect = args.droppableRects.get(container.id);

      return rect ? { container, rect } : null;
    })
    .filter(
      (entry): entry is NonNullable<typeof entry> => entry !== null,
    )
    .sort((left, right) => left.rect.top - right.rect.top);

  if (orderedTaskRects.length === 0) {
    return [];
  }

  const targetEntry =
    orderedTaskRects.find(
      ({ rect }) => activeMiddleY < rect.top + rect.height / 2,
    ) ?? orderedTaskRects.at(-1);

  if (!targetEntry) {
    return [];
  }

  const centerY = targetEntry.rect.top + targetEntry.rect.height / 2;
  const value = Math.abs(activeMiddleY - centerY);

  return [
    {
      id: targetEntry.container.id,
      data: {
        droppableContainer: targetEntry.container,
        value,
      },
    },
  ];
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
