const toStringOr = (value: unknown, fallback = ""): string => {
  return typeof value === "string" ? value : fallback;
};
const toOptionalString = (value: unknown): string | undefined => {
  return typeof value === "string" ? value : undefined;
};
const toBoolOr = (value: unknown, fallback = false): boolean => {
  return typeof value === "boolean" ? value : fallback;
};
const toFiniteNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = Number(value);
    if (Number.isFinite(normalized)) return normalized;
  }
  return fallback;
};
const toArrayOr = (value: unknown, fallback: unknown[] = []): unknown[] => {
  return Array.isArray(value) ? value : fallback;
};



export { toStringOr, toOptionalString, toBoolOr, toFiniteNumber, toArrayOr };
