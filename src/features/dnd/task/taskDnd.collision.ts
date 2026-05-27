import { closestCorners, pointerWithin, rectIntersection, type CollisionDetection } from "@dnd-kit/core";
import type { CollisionDescriptor, CollisionDetectionArgs } from "./taskDnd.types";

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
  const activeCenterX = args.pointerCoordinates?.x ?? activeRect.left + activeRect.width / 2;
  const activeCenterY = args.pointerCoordinates?.y ?? activeRect.top + activeRect.height / 2;
  let nearestCollision: CollisionDescriptor | null = null;

  for (const container of slotContainers) {
    const rect = args.droppableRects.get(container.id);

    if (!rect) {
      continue;
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
    const value = verticalDistance + horizontalDistance * 2;

    if (
      nearestCollision === null ||
      value < (nearestCollision.data?.value ?? Number.POSITIVE_INFINITY)
    ) {
      nearestCollision = {
        id: container.id,
        data: {
          droppableContainer: container,
          value,
        },
      };
    }
  }

  return nearestCollision ? [nearestCollision] : [];
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