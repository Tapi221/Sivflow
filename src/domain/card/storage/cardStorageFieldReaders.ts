const readCardStorageStringField = (record: Record<string, unknown>, key: string): string | null => {
  const candidate = record[key];
  return typeof candidate === "string" ? candidate : null;
};
const readCardStorageFiniteNumberField = (record: Record<string, unknown>, key: string): number | null => {
  const candidate = record[key];
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? candidate
    : null;
};



export { readCardStorageStringField, readCardStorageFiniteNumberField };
