import { getLocalDb } from "@/services/localdb";
import type { QueryableTable } from "@/services/localdb/types";
import type { DocumentItem } from "@/types";



type BlobScopeOptions = {
  userId?: string | null;
};
type StoredDocumentFile = {
  id: string;
  blob: Blob;
  updatedAt: number;
};
type SaveDocumentWithBlobParams = {
  db: Awaited<ReturnType<typeof getLocalDb>>;
  document: DocumentItem;
  blob: Blob;
};
type LocalDbWithDocumentFiles = Awaited<ReturnType<typeof getLocalDb>> & {
  documentFiles: QueryableTable<StoredDocumentFile, string>;
};



const getDocumentFilesTable = (db: Awaited<ReturnType<typeof getLocalDb>>) =>
  (db as LocalDbWithDocumentFiles).documentFiles;
const resolveDocumentFileId = (
  document: Pick<DocumentItem, "id" | "localFileId">,
): string => {
  const localFileId =
    typeof document.localFileId === "string" ? document.localFileId.trim() : "";

  return localFileId.length > 0 ? localFileId : document.id;
};
const saveDocumentWithBlob = async ({ db, document, blob }: SaveDocumentWithBlobParams): Promise<void> => {
  const documentFiles = getDocumentFilesTable(db);
  const localFileId = resolveDocumentFileId(document);

  await db.runSyncTransaction(async () => {
    await documentFiles.put({
      id: localFileId,
      blob,
      updatedAt: Date.now(),
    });

    await db.documents.put(document);
  });
};
const saveDocumentBlob = async (id: string, blob: Blob, options?: BlobScopeOptions): Promise<void> => {
  const db = await getLocalDb(options?.userId ?? undefined);

  await getDocumentFilesTable(db).put({
    id,
    blob,
    updatedAt: Date.now(),
  });
};
const getDocumentBlob = async (id: string, options?: BlobScopeOptions): Promise<Blob | null> => {
  const db = await getLocalDb(options?.userId ?? undefined);
  const stored = await getDocumentFilesTable(db).get(id);

  return stored?.blob ?? null;
};
const deleteDocumentBlob = async (id: string, options?: BlobScopeOptions): Promise<void> => {
  const db = await getLocalDb(options?.userId ?? undefined);
  await getDocumentFilesTable(db).delete(id);
};
const deleteDocumentBlobsByUser = async (userId: string): Promise<void> => {
  if (!userId) return;

  const db = await getLocalDb(userId);
  await getDocumentFilesTable(db).clear();
};



export { saveDocumentWithBlob, saveDocumentBlob, getDocumentBlob, deleteDocumentBlob, deleteDocumentBlobsByUser };
