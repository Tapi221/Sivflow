import type { AppSnapshot } from "@/types/domain/snapshot";
import { CURRENT_SCHEMA_VERSION } from "@/types/domain/snapshot";



const parseSnapshotFile = async (file: File): Promise<AppSnapshot> => {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!parsed.metadata || !parsed.data) {
    throw new Error("Invalid snapshot format: missing metadata or data");
  }

  if (typeof parsed.metadata.schemaVersion !== "number") {
    throw new Error("Invalid snapshot format: missing schemaVersion");
  }

  if (typeof parsed.metadata.generationCounter !== "number") {
    throw new Error("Invalid snapshot format: missing generationCounter");
  }

  if (parsed.metadata.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schema version: ${parsed.metadata.schemaVersion}`,
    );
  }

  if (!Array.isArray(parsed.data.cardSets)) {
    parsed.data.cardSets = [];
  }

  if (!Array.isArray(parsed.data.assets)) {
    parsed.data.assets = [];
  }

  return parsed as AppSnapshot;
};



export { parseSnapshotFile };
