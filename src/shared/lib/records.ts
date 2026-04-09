export type UnknownRecord = Record<string, unknown>;

export const asRecord = (value: unknown): UnknownRecord | null => {
  return value !== null && typeof value === "object"
    ? (value as UnknownRecord)
    : null;
};

export const pick = (...values: unknown[]): unknown => {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};
