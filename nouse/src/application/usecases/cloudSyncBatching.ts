import type { SyncChange } from "@/services/interfaces/ISyncService";



const MAX_BATCH_BYTES = Math.floor(7.5 * 1024 * 1024);
const MAX_BATCH_OPS = 450;
const encoder = new TextEncoder();



const estimateBytes = (value: unknown) => {
  try {
    return encoder.encode(JSON.stringify(value)).length;
  } catch {
    return 1024 * 1024;
  }
};
const chunkCloudSyncChangesBySize = (changes: SyncChange[]): SyncChange[][] => {
  const chunks: SyncChange[][] = [];
  let current: SyncChange[] = [];
  let bytes = 0;

  for (const change of changes) {
    const docBytes = estimateBytes(change.data ?? {});
    const extra = docBytes + 512;

    const wouldExceedBytes =
      current.length > 0 && bytes + extra > MAX_BATCH_BYTES;
    const wouldExceedOps =
      current.length > 0 && current.length + 1 > MAX_BATCH_OPS;

    if (wouldExceedBytes || wouldExceedOps) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }

    current.push(change);
    bytes += extra;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
};



export { chunkCloudSyncChangesBySize };
