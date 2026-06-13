import type { JsonFileExportPort } from "@/application/ports/JsonFileExportPort";
import { createCreateSnapshotUseCase } from "./CreateSnapshot";
import { buildCardSetById, filterCardsByFolderId } from "@/domain/card/selectors/cardFolder";
import { localGenerationCounterStore } from "@/infrastructure/browser-storage/LocalGenerationCounterStore";
import type { Card } from "@/types";
import type { AppSnapshot } from "@/types/domain/snapshot";



interface ExportFolderSnapshotDependencies {
  fileExporter: JsonFileExportPort;
}



const createSnapshotUseCase = createCreateSnapshotUseCase({
  generationCounterStore: localGenerationCounterStore,
});



const collectAssetIdsFromCards = (cards: Card[]): Set<string> => {
  const assetIds = new Set<string>();

  const collectFromBlocks = (blocks: unknown) => {
    if (!Array.isArray(blocks)) return;

    for (const block of blocks) {
      if (!block || typeof block !== "object") continue;
      const record = block as {
        type?: unknown;
        images?: Array<{
          assetId?: string | null;
          id?: string | null;
        }>;
      };

      if (record.type !== "image" || !Array.isArray(record.images)) continue;

      for (const image of record.images) {
        const assetId =
          typeof image?.assetId === "string" && image.assetId.trim().length > 0
            ? image.assetId.trim()
            : typeof image?.id === "string" && image.id.trim().length > 0
              ? image.id.trim()
              : "";
        if (assetId) {
          assetIds.add(assetId);
        }
      }
    }
  };

  for (const card of cards) {
    collectFromBlocks(card.front?.blocks);
    collectFromBlocks(card.back?.blocks);
  }

  return assetIds;
};
const createExportFolderSnapshotUseCase = ({ fileExporter }: ExportFolderSnapshotDependencies) => {
  const execute = async (userId: string, folderId: string): Promise<void> => {
    const fullSnapshot = await createSnapshotUseCase.execute(userId);
    const folder = fullSnapshot.data.folders.find(
      (item) => item.id === folderId,
    );

    if (!folder) {
      throw new Error("Folder not found");
    }

    const cardSetById = buildCardSetById(
      fullSnapshot.data.cardSets.filter((cardSet) => !cardSet.isDeleted),
    );
    const cards = filterCardsByFolderId(
      fullSnapshot.data.cards,
      folderId,
      cardSetById,
    );

    const cardSetIds = new Set(
      cards
        .map((card) => card.cardSetId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );
    const cardSets = fullSnapshot.data.cardSets.filter((cardSet) =>
      cardSetIds.has(cardSet.id),
    );
    const assetIds = collectAssetIdsFromCards(cards);

    const partialSnapshot: AppSnapshot = {
      metadata: fullSnapshot.metadata,
      data: {
        cards,
        cardSets,
        folders: [folder],
        reviews: [],
        assets: fullSnapshot.data.assets.filter((asset) =>
          assetIds.has(asset.assetId),
        ),
        settings: null,
      },
    };

    const folderRecord = folder as unknown as {
      folderName?: string;
      folder_name?: string;
    };
    const folderName =
      (folderRecord.folderName || folderRecord.folder_name) ?? "unknown";
    const date = new Date().toISOString().split("T")[0];
    const generationCounter = partialSnapshot.metadata.generationCounter;
    const filename = `flashcard_${folderName}_${date}_gen${generationCounter}.json`;

    await fileExporter.exportJson({
      filename,
      payload: partialSnapshot,
    });
  };

  return {
    execute,
  };
};



export { createExportFolderSnapshotUseCase };


export type { ExportFolderSnapshotDependencies };
