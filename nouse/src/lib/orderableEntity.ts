import { toMillis } from "@/utils/toMillis";



type OrderableEntitySelectors<T> = {
  getOrderIndex: (entity: T) => number | null | undefined;
  getUpdatedAt: (entity: T) => unknown;
  getCreatedAt: (entity: T) => unknown;
  getName: (entity: T) => string | null | undefined;
  getId: (entity: T) => string | null | undefined;
};



const toTimestamp = (value: unknown): number => {
  return toMillis(value);
};
const getOrderableOrderIndex = <T>(entity: T, selectors: Pick<OrderableEntitySelectors<T>, "getOrderIndex">): number => {
  return selectors.getOrderIndex(entity) ?? 0;
};
const compareOrderableEntities = <T>(left: T, right: T, selectors: OrderableEntitySelectors<T>): number => {
  const orderCompare = getOrderableOrderIndex(left, selectors) - getOrderableOrderIndex(right, selectors);
  if (orderCompare !== 0) return orderCompare;

  const updatedCompare =
    toTimestamp(selectors.getUpdatedAt(right)) -
    toTimestamp(selectors.getUpdatedAt(left));
  if (updatedCompare !== 0) return updatedCompare;

  const createdCompare =
    toTimestamp(selectors.getCreatedAt(right)) -
    toTimestamp(selectors.getCreatedAt(left));
  if (createdCompare !== 0) return createdCompare;

  const nameCompare = (selectors.getName(left) ?? "").localeCompare(
    selectors.getName(right) ?? "",
    "ja",
  );
  if (nameCompare !== 0) return nameCompare;

  return (selectors.getId(left) ?? "").localeCompare(
    selectors.getId(right) ?? "",
    "ja",
  );
};



export { getOrderableOrderIndex, compareOrderableEntities };
