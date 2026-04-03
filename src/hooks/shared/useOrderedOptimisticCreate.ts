import type { Dispatch, SetStateAction } from "react";

type OrderedOptimisticCreateParams<T> = {
  entities: T[];
  setOptimisticEntities: Dispatch<SetStateAction<T[]>>;
  getEntityId: (entity: T) => string | null | undefined;
  getParentId: (entity: T) => string | null | undefined;
  getOrderIndex: (entity: T) => number | null | undefined;
  setOrderIndex: (entity: T, orderIndex: number) => T;
  createTempEntity: (args: {
    id: string;
    name: string;
    parentId: string | null;
    orderIndex: number;
  }) => T;
  persistCreate: (args: {
    id: string;
    name: string;
    parentId: string | null;
    orderIndex: number;
  }) => Promise<void>;
  targetParentId: string | null;
  newEntityName: string;
  newEntityId: string;
  onAfterOptimisticCreate?: (entity: T) => void;
};

export const createOrderedOptimistically = async ({
  entities,
  setOptimisticEntities,
  getEntityId,
  getParentId,
  getOrderIndex,
  setOrderIndex,
  createTempEntity,
  persistCreate,
  targetParentId,
  newEntityName,
  newEntityId,
  onAfterOptimisticCreate,
}: OrderedOptimisticCreateParams<T>) => {
  const siblingIds = new Set<string>();
  const originalOrderIndexes = new Map<string, number>();

  for (const entity of entities) {
    const entityId = getEntityId(entity);
    if (!entityId || entityId === newEntityId) continue;
    if (getParentId(entity) !== targetParentId) continue;
    siblingIds.add(entityId);
    originalOrderIndexes.set(entityId, getOrderIndex(entity) ?? 0);
  }

  const optimisticEntity = createTempEntity({
    id: newEntityId,
    name: newEntityName,
    parentId: targetParentId,
    orderIndex: 0,
  });

  setOptimisticEntities((prev) => [
    optimisticEntity,
    ...prev.map((entity) => {
      const entityId = getEntityId(entity);
      if (!entityId || !siblingIds.has(entityId)) return entity;
      return setOrderIndex(entity, (getOrderIndex(entity) ?? 0) + 1);
    }),
  ]);

  onAfterOptimisticCreate?.(optimisticEntity);

  try {
    await persistCreate({
      id: newEntityId,
      name: newEntityName,
      parentId: targetParentId,
      orderIndex: 0,
    });
  } catch (error) {
    setOptimisticEntities((prev) =>
      prev
        .filter((entity) => getEntityId(entity) !== newEntityId)
        .map((entity) => {
          const entityId = getEntityId(entity);
          if (!entityId || !siblingIds.has(entityId)) return entity;
          const originalOrderIndex = originalOrderIndexes.get(entityId);
          if (originalOrderIndex === undefined) return entity;
          return setOrderIndex(entity, originalOrderIndex);
        }),
    );
    throw error;
  }
};
