import type { JsonFileExportPort } from "@/application/ports/JsonFileExportPort";
import { localGenerationCounterStore } from "@/infrastructure/browser-storage/LocalGenerationCounterStore";
import type { AppSnapshot } from "@/types/domain/snapshot";
import { createCreateSnapshotUseCase } from "./CreateSnapshot";

export interface ExportFolderSnapshotDependencies {
  fileExporter: JsonFileExportPort;
}

const createSnapshotUseCase = createCreateSnapshotUseCase({
  generationCounterStore: localGenerationCounterStore,
});

export const createExportFolderSnapshotUseCase = ({
  fileExporter,
}: ExportFolderSnapshotDependencies) => {
  const execute = async (userId: string, folderId: string): Promise<void> => {
    const fullSnapshot = await createSnapshotUseCase.execute(userId);
    const folder = fullSnapshot.data.folders.find(
      (item) => item.id === folderId,
    );

    if (!folder) {
      throw new Error("Folder not found");
    }

    const cards = fullSnapshot.data.cards.filter(
      (card) => card.folderId === folderId,
    );

    const partialSnapshot: AppSnapshot = {
      metadata: fullSnapshot.metadata,
      data: {
        cards,
        folders: [folder],
        reviews: [],
        assets: fullSnapshot.data.assets,
        settings: null,
      },
    };

    const folderName =
      (folder as Record<string, unknown>).folderName ||
      (folder as Record<string, unknown>).folder_name ||
      "unknown";
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
