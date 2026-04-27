import type {
  ExplorerDetailRow,
  ExplorerDetailRowKind,
} from "@/components/folder/explorer/model/detailRows";

export type ExplorerDetailOrderScopeKeyByKind = Record<
  ExplorerDetailRowKind,
  string
>;

export type ExplorerDetailOptimisticOrderEntry = {
  operationId: number;
  orderedIds: string[];
};

export type ExplorerDetailOptimisticOrderState = Record<
  string,
  ExplorerDetailOptimisticOrderEntry
>;

type ExplorerDetailOrderScopeParams = {
  kind: ExplorerDetailRowKind;
  currentFolderId: string | null;
  currentCardSetId: string | null;
};

type ApplyExplorerDetailOptimisticOrderParams = {
  rows: ExplorerDetailRow[];
  optimisticOrderByKey: ExplorerDetailOptimisticOrderState;
  orderScopeKeyByKind: ExplorerDetailOrderScopeKeyByKind;
};

const DETAIL_ROW_KINDS = [
  "folder",
  "cardSet",
  "card",
  "document",
] as const satisfies readonly ExplorerDetailRowKind[];

const ROOT_FOLDER_SCOPE_ID = "__root__";
const EMPTY_CARD_SET_SCOPE_ID = "__no-card-set__";

export const getExplorerDetailOrderScopeKey = ({
  kind,
  currentFolderId,
  currentCardSetId,
}: ExplorerDetailOrderScopeParams): string => {
  if (kind === "card") {
    return `cardSet:${currentCardSetId ?? EMPTY_CARD_SET_SCOPE_ID}`;
  }

  return `folder:${currentFolderId ?? ROOT_FOLDER_SCOPE_ID}`;
};

export const buildExplorerDetailOrderScopeKeyByKind = ({
  currentFolderId,
  currentCardSetId,
}: {
  currentFolderId: string | null;
  currentCardSetId: string | null;
}): ExplorerDetailOrderScopeKeyByKind => {
  return {
    folder: getExplorerDetailOrderScopeKey({
      kind: "folder",
      currentFolderId,
      currentCardSetId,
    }),
    cardSet: getExplorerDetailOrderScopeKey({
      kind: "cardSet",
      currentFolderId,
      currentCardSetId,
    }),
    card: getExplorerDetailOrderScopeKey({
      kind: "card",
      currentFolderId,
      currentCardSetId,
    }),
    document: getExplorerDetailOrderScopeKey({
      kind: "document",
      currentFolderId,
      currentCardSetId,
    }),
  };
};

export const getExplorerDetailOptimisticOrderKey = (
  kind: ExplorerDetailRowKind,
  scopeKey: string,
): string => {
  return `${kind}:${scopeKey}`;
};

export const getExplorerDetailScopedOrderedIds = (
  rows: readonly ExplorerDetailRow[],
  kind: ExplorerDetailRowKind,
): string[] => {
  return rows.filter((row) => row.kind === kind).map((row) => row.id);
};

export const areExplorerDetailOrderedIdsEqual = (
  left: readonly string[],
  right: readonly string[],
): boolean => {
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
};

const reconcileOrderedIdsForCurrentIds = (
  orderedIds: readonly string[],
  currentIds: readonly string[],
): string[] => {
  const currentIdSet = new Set(currentIds);
  const optimisticIdSet = new Set(orderedIds);

  return [
    ...orderedIds.filter((id) => currentIdSet.has(id)),
    ...currentIds.filter((id) => !optimisticIdSet.has(id)),
  ];
};

const reconcileRowsWithOrderedIds = (
  rows: readonly ExplorerDetailRow[],
  orderedIds: readonly string[],
): ExplorerDetailRow[] => {
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const optimisticIdSet = new Set(orderedIds);

  const orderedRows = orderedIds
    .map((id) => rowById.get(id))
    .filter((row): row is ExplorerDetailRow => Boolean(row));

  const untrackedRows = rows.filter((row) => !optimisticIdSet.has(row.id));

  return [...orderedRows, ...untrackedRows];
};

export const applyExplorerDetailOptimisticOrder = ({
  rows,
  optimisticOrderByKey,
  orderScopeKeyByKind,
}: ApplyExplorerDetailOptimisticOrderParams): ExplorerDetailRow[] => {
  if (Object.keys(optimisticOrderByKey).length === 0) return rows;

  const rowBuckets = new Map<ExplorerDetailRowKind, ExplorerDetailRow[]>();

  rows.forEach((row) => {
    const bucket = rowBuckets.get(row.kind) ?? [];
    bucket.push(row);
    rowBuckets.set(row.kind, bucket);
  });

  const orderedBuckets = new Map<ExplorerDetailRowKind, ExplorerDetailRow[]>();

  rowBuckets.forEach((bucketRows, kind) => {
    const scopeKey = orderScopeKeyByKind[kind];
    const orderKey = getExplorerDetailOptimisticOrderKey(kind, scopeKey);
    const entry = optimisticOrderByKey[orderKey];

    orderedBuckets.set(
      kind,
      entry
        ? reconcileRowsWithOrderedIds(bucketRows, entry.orderedIds)
        : bucketRows,
    );
  });

  const emittedKinds = new Set<ExplorerDetailRowKind>();

  return rows.flatMap((row) => {
    if (emittedKinds.has(row.kind)) return [];

    emittedKinds.add(row.kind);
    return orderedBuckets.get(row.kind) ?? [];
  });
};

export const pruneResolvedExplorerDetailOptimisticOrder = ({
  rows,
  optimisticOrderByKey,
  orderScopeKeyByKind,
}: ApplyExplorerDetailOptimisticOrderParams): ExplorerDetailOptimisticOrderState => {
  let nextOrderByKey = optimisticOrderByKey;

  DETAIL_ROW_KINDS.forEach((kind) => {
    const scopeKey = orderScopeKeyByKind[kind];
    const orderKey = getExplorerDetailOptimisticOrderKey(kind, scopeKey);
    const entry = nextOrderByKey[orderKey];
    if (!entry) return;

    const currentIds = getExplorerDetailScopedOrderedIds(rows, kind);
    if (currentIds.length === 0) return;

    const expectedIds = reconcileOrderedIdsForCurrentIds(
      entry.orderedIds,
      currentIds,
    );

    if (!areExplorerDetailOrderedIdsEqual(currentIds, expectedIds)) {
      return;
    }

    const { [orderKey]: _resolvedEntry, ...rest } = nextOrderByKey;
    nextOrderByKey = rest;
  });

  return nextOrderByKey;
};
