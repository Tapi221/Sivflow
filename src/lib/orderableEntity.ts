type OrderableEntitySelectors<T> = {
  getOrderIndex: (entity: T) => number | null | undefined;
  getUpdatedAt: (entity: T) => Date | string | number | null | undefined;
  getCreatedAt: (entity: T) => Date | string | number | null | undefined;
  getName: (entity: T) => string | null | undefined;
  getId: (entity: T) => string | null | undefined;
};

function toTimestamp(value: Date | string | number | null | undefined): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function getOrderableOrderIndex<T>(
  entity: T,
  selectors: Pick<OrderableEntitySelectors<T>, "getOrderIndex">,
): number {
  return selectors.getOrderIndex(entity) ?? 0;
}

export function compareOrderableEntities<T>(
  a: T,
  b: T,
  selectors: OrderableEntitySelectors<T>,
): number {
  const orderCompare =
    getOrderableOrderIndex(a, selectors) - getOrderableOrderIndex(b, selectors);
  if (orderCompare !== 0) return orderCompare;

  const updatedCompare =
    toTimestamp(selectors.getUpdatedAt(b)) -
    toTimestamp(selectors.getUpdatedAt(a));
  if (updatedCompare !== 0) return updatedCompare;

  const createdCompare =
    toTimestamp(selectors.getCreatedAt(b)) -
    toTimestamp(selectors.getCreatedAt(a));
  if (createdCompare !== 0) return createdCompare;

  const nameCompare = (selectors.getName(a) ?? "").localeCompare(
    selectors.getName(b) ?? "",
    "ja",
  );
  if (nameCompare !== 0) return nameCompare;

  return (selectors.getId(a) ?? "").localeCompare(
    selectors.getId(b) ?? "",
    "ja",
  );
}
