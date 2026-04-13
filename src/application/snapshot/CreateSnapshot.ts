import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import {
  getLocalDb,
  getLocalDBRuntimeStatus,
} from "@/infrastructure/persistence/indexeddb";
import type { GenerationCounterStorePort } from "@/application/ports/GenerationCounterStorePort";
import type {
  AppSnapshot,
  SnapshotAsset,
  SnapshotData,
  SnapshotMetadata,
} from "@/types/domain/snapshot";
import { APP_VERSION, CURRENT_SCHEMA_VERSION } from "@/types/domain/snapshot";
import { toSnapshotAsset } from "./snapshotAssetManifest";

export interface CreateSnapshotDependencies {
  generationCounterStore: GenerationCounterStorePort;
}

export const createCreateSnapshotUseCase = ({
  generationCounterStore,
}: CreateSnapshotDependencies) => {
  const assertPersistentStorageAvailable = (operation: string): void => {
    const status = getLocalDBRuntimeStatus();

    if (status.mode === "fallback") {
      throw new Error(
        `[Snapshot] ${operation} is unavailable in fallback mode. Local persistent storage is disabled for this session.`,
      );
    }
  };

  const execute = async (
    userId: string,
    options: {
      bumpGenerationCounter?: boolean;
    } = {},
  ): Promise<AppSnapshot> => {
    assertPersistentStorageAvailable("createSnapshot");

    const db = await getLocalDb(userId);
    const allCards = await db.getAllCards();
    const allFolders = await db.getAllFolders();
    const imageRows = await db.images.toArray();

    const cards = allCards.map(normalizeCard);
    const folders = allFolders.map(normalizeFolder);
    const assets = imageRows
      .map(toSnapshotAsset)
      .filter((asset): asset is SnapshotAsset => asset !== null);

    const metadata: SnapshotMetadata = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      generationCounter:
        options.bumpGenerationCounter !== false
          ? generationCounterStore.increment()
          : generationCounterStore.get(),
      createdAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      userId,
    };

    const data: SnapshotData = {
      cards,
      folders,
      reviews: [],
      assets,
      settings: null,
    };

    return {
      metadata,
      data,
    };
  };

  return {
    execute,
  };
};
