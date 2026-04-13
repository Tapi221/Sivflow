import { localGenerationCounterStore } from "@/infrastructure/browser-storage/LocalGenerationCounterStore";
import type { AppSnapshot, SnapshotComparison } from "@/types/domain/snapshot";
import { createCreateSnapshotUseCase } from "./CreateSnapshot";

const createSnapshotUseCase = createCreateSnapshotUseCase({
  generationCounterStore: localGenerationCounterStore,
});

export const createCompareSnapshotUseCase = () => {
  const execute = async (
    imported: AppSnapshot,
    userId: string,
  ): Promise<SnapshotComparison> => {
    const local = await createSnapshotUseCase.execute(userId, {
      bumpGenerationCounter: false,
    });

    const localGeneration = local.metadata.generationCounter;
    const importedGeneration = imported.metadata.generationCounter;

    const newerSnapshot =
      localGeneration > importedGeneration
        ? "local"
        : importedGeneration > localGeneration
          ? "imported"
          : "same";

    const localCardIds = new Set(local.data.cards.map((card) => card.id));
    const importedCardIds = new Set(imported.data.cards.map((card) => card.id));
    const localFolderIds = new Set(
      local.data.folders.map((folder) => folder.id),
    );
    const importedFolderIds = new Set(
      imported.data.folders.map((folder) => folder.id),
    );
    const localAssetIds = new Set(
      local.data.assets.map((asset) => asset.assetId),
    );
    const importedAssetIds = new Set(
      imported.data.assets.map((asset) => asset.assetId),
    );

    return {
      newerSnapshot,
      localGeneration,
      importedGeneration,
      diff: {
        cardsAdded: [...importedCardIds].filter((id) => !localCardIds.has(id))
          .length,
        cardsRemoved: [...localCardIds].filter((id) => !importedCardIds.has(id))
          .length,
        cardsModified: 0,
        foldersAdded: [...importedFolderIds].filter(
          (id) => !localFolderIds.has(id),
        ).length,
        assetsAdded: [...importedAssetIds].filter(
          (id) => !localAssetIds.has(id),
        ).length,
        foldersRemoved: [...localFolderIds].filter(
          (id) => !importedFolderIds.has(id),
        ).length,
        assetsRemoved: [...localAssetIds].filter(
          (id) => !importedAssetIds.has(id),
        ).length,
      },
    };
  };

  return {
    execute,
  };
};
