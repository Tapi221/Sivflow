import {
  closestCorners,
  type CollisionDetection,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";

import type {
  CollisionDescriptor,
  CollisionDetectionArgs,
} from "./taskDnd.types";

const getDistanceFromRange = (
  value: number,
  start: number,
  end: number,
): number => {
  if (value < start) {
    return start - value;
  }

  if (value > end) {
    return value - end;
  }

  return 0;
};

const getDroppableColumnId = (
  container: CollisionDetectionArgs["droppableContainers"][number],
): string | null => {
  const columnId = container.data.current?.columnId ?? container.data.current?.status;
  return typeof columnId === "string" && columnId.length > 0 ? columnId : null;
};

const getNearestSlotCollision = (
  args: CollisionDetectionArgs,
  slotContainers: CollisionDetectionArgs["droppableContainers"],
): CollisionDescriptor[] => {
  const activeRect = args.collisionRect;
  const activeCenterX = activeRect.left + activeRect.width / 2;
  const activeCenterY = activeRect.top + activeRect.height / 2;

  const slotCollisions = slotContainers
    .map((container): CollisionDescriptor | null => {
      const rect = args.droppableRects.get(container.id);

      if (!rect) {
        return null;
      }

      const horizontalDistance = getDistanceFromRange(
        activeCenterX,
        rect.left,
        rect.left + rect.width,
      );
      const verticalDistance = getDistanceFromRange(
        activeCenterY,
        rect.top,
        rect.top + rect.height,
      );

      return {
        id: container.id,
        data: {
          droppableContainer: container,
          value: verticalDistance + horizontalDistance * 2,
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
  const overColumnId = overColumn ? getDroppableColumnId(overColumn) : null;

  if (overColumnId) {
    const targetColumnSlots = slotContainers.filter(
      (container) => getDroppableColumnId(container) === overColumnId,
    );

    if (targetColumnSlots.length > 0) {
      return getNearestSlotCollision(args, targetColumnSlots);
    }

    return columnCollisions;
  }

  const slotCollisions = getNearestSlotCollision(args, slotContainers);

  return slotCollisions.length > 0 ? slotCollisions : closestCorners(args);
};
