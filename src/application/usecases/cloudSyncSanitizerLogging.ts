type FirestoreRecord = Record<string, unknown>;



const isRecord = (value: unknown): value is FirestoreRecord =>
  typeof value === "object" && value !== null;
const getRecordId = (value: unknown): string | null => {
  if (!isRecord(value)) return null;
  const id = value.id;
  return typeof id === "string" && id.length > 0 ? id : null;
};
const getCloudSyncSanitizerLogPayload = (type: string, data: unknown, fixes: unknown): { type: string; id: string | null; fixes: unknown; } => ({
  type,
  id: getRecordId(data),
  fixes,
});



export { getCloudSyncSanitizerLogPayload };
