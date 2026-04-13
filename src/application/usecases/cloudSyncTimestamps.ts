type FirestoreRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is FirestoreRecord =>
  typeof value === "object" && value !== null;

export const getUpdatedAtMillis = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (!isRecord(value)) return 0;

  const maybeToMillis = value.toMillis;
  if (typeof maybeToMillis === "function") {
    const result = maybeToMillis.call(value);
    if (typeof result === "number") return result;
  }

  const maybeGetTime = value.getTime;
  if (typeof maybeGetTime === "function") {
    const result = maybeGetTime.call(value);
    if (typeof result === "number") return result;
  }

  return 0;
};
