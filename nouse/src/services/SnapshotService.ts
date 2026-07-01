import { createCompareSnapshotUseCase } from "@/application/snapshot/CompareSnapshot";
import { createCreateSnapshotUseCase } from "@/application/snapshot/CreateSnapshot";
import { createExportFolderSnapshotUseCase } from "@/application/snapshot/ExportFolderSnapshot";
import { createExportSnapshotUseCase } from "@/application/snapshot/ExportSnapshot";
import { parseSnapshotFile } from "@/application/snapshot/ParseSnapshotFile";
import { createSnapshotStoreUseCase } from "@/application/snapshot/StoreSnapshot";
import { browserJsonFileExportAdapter } from "@/infrastructure/browser-storage/BrowserJsonFileExportAdapter";
import { localGenerationCounterStore } from "@/infrastructure/browser-storage/LocalGenerationCounterStore";
import { snapshotFirestoreRepository } from "@/infrastructure/firebase/firestore/SnapshotFirestoreRepository";
import type { AppSnapshot } from "@/types/domain/snapshot";



const SNAPSHOTS_KEY = "flashcard_snapshots";
const createSnapshotUseCase = createCreateSnapshotUseCase({
  generationCounterStore: localGenerationCounterStore,
});
const compareSnapshotUseCase = createCompareSnapshotUseCase();
const exportSnapshotUseCase = createExportSnapshotUseCase({
  fileExporter: browserJsonFileExportAdapter,
});
const exportFolderSnapshotUseCase = createExportFolderSnapshotUseCase({
  fileExporter: browserJsonFileExportAdapter,
});
const snapshotStoreUseCase = createSnapshotStoreUseCase({
  repository: snapshotFirestoreRepository,
});
const snapshotService = { createSnapshot: async (userId: string, options: { bumpGenerationCounter?: boolean;
} = {},
) => {
  return await createSnapshotUseCase.execute(userId, options);
},

exportToFile: async (userId: string, folderName?: string): Promise<void> => {
  await exportSnapshotUseCase.execute(userId, folderName);
},

exportFolder: async (userId: string, folderId: string): Promise<void> => {
  await exportFolderSnapshotUseCase.execute(userId, folderId);
},

parseSnapshotFile,

compareWithLocal: async (imported: AppSnapshot, userId: string) => {
  return await compareSnapshotUseCase.execute(imported, userId);
},

saveToFirestore: async (snapshot: AppSnapshot): Promise<void> => {
  await snapshotStoreUseCase.save(snapshot);
},

getStoredSnapshots: async (userId: string): Promise<AppSnapshot[]> => {
  return await snapshotStoreUseCase.list(userId);
},

migrateFromLocalStorage: async (userId: string): Promise<void> => {
  const localSnapshots = getStoredSnapshotsFromLocalStorage();

  if (localSnapshots.length === 0) {
    console.log("[スナップショット] 移行対象のローカルスナップショットはありません");
    return;
  }

  for (const snapshot of localSnapshots) {
    snapshot.metadata.userId = userId;
    await snapshotStoreUseCase.save(snapshot);
  }

  localStorage.removeItem(SNAPSHOTS_KEY);
  console.log("[スナップショット] 移行が完了しました。LocalStorage をクリアしました");
},
};



const getStoredSnapshotsFromLocalStorage = (): AppSnapshot[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const storedJson = localStorage.getItem(SNAPSHOTS_KEY);
  return storedJson ? (JSON.parse(storedJson) as AppSnapshot[]) : [];
};



export { snapshotService };
