import type { JsonFileExportPort } from "@/application/ports/JsonFileExportPort";
import { createCreateSnapshotUseCase } from "./CreateSnapshot";
import { localGenerationCounterStore } from "@/infrastructure/browser-storage/LocalGenerationCounterStore";



interface ExportSnapshotDependencies {
  fileExporter: JsonFileExportPort;
}



const createSnapshotUseCase = createCreateSnapshotUseCase({
  generationCounterStore: localGenerationCounterStore,
});



const createExportSnapshotUseCase = ({ fileExporter }: ExportSnapshotDependencies) => {
  const execute = async (userId: string, folderName?: string): Promise<void> => {
    const snapshot = await createSnapshotUseCase.execute(userId);
    const date = new Date().toISOString().split("T")[0];
    const generationCounter = snapshot.metadata.generationCounter;
    const folderPart = folderName ? `_${folderName}` : "";
    const filename = `flashcard${folderPart}_${date}_gen${generationCounter}.json`;

    await fileExporter.exportJson({
      filename,
      payload: snapshot,
    });
  };

  return {
    execute,
  };
};



export { createExportSnapshotUseCase };


export type { ExportSnapshotDependencies };
