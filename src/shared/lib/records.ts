type UnknownRecord = Record<string, unknown>;



const asRecord = (value: unknown): UnknownRecord | null => {
  return value !== null && typeof value === "object" ? (value as UnknownRecord) : null;
};
const pick = (...values: unknown[]): unknown => {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};



export { asRecord, pick };


export type { UnknownRecord };
