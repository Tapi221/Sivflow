import { getLocalDb } from "@/services/localDB";
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

const getDocumentFilesTable = (db: Awaited<ReturnType<typeof getLocalDb>>) =>
  db.table<StoredDocumentFile, string>("documentFiles");

const resolveDocumentFileId = (
  document: Pick<DocumentItem, "id" | "localFileId">,
): string => {
  const localFileId =
    typeof document.localFileId === "string" ? document.localFileId.trim() : "";

  return localFileId.length > 0 ? localFileId : document.id;
};

export const saveDocumentWithBlob = async ({
  db,
  document,
  blob,
}: SaveDocumentWithBlobParams): Promise<void> => {
  const documentFiles = getDocumentFilesTable(db);
  const localFileId = resolveDocumentFileId(document);

  await db.transaction("rw", db.documents, documentFiles, async () => {
    await documentFiles.put({
      id: localFileId,
      blob,
      updatedAt: Date.now(),
    });

    await db.documents.put(document as DocumentItem & Record<string, unknown>);
  });
};

export const saveDocumentBlob = async (
  id: string,
  blob: Blob,
  options?: BlobScopeOptions,
): Promise<void> => {
  const db = await getLocalDb(options?.userId ?? undefined);

  await getDocumentFilesTable(db).put({
    id,
    blob,
    updatedAt: Date.now(),
  });
};

export const getDocumentBlob = async (
  id: string,
  options?: BlobScopeOptions,
): Promise<Blob | null> => {
  const db = await getLocalDb(options?.userId ?? undefined);
  const stored = await getDocumentFilesTable(db).get(id);

  return stored?.blob ?? null;
};

export const deleteDocumentBlob = async (
  id: string,
  options?: BlobScopeOptions,
): Promise<void> => {
  const db = await getLocalDb(options?.userId ?? undefined);
  await getDocumentFilesTable(db).delete(id);
};

export const deleteDocumentBlobsByUser = async (
  userId: string,
): Promise<void> => {
  if (!userId) return;

  const db = await getLocalDb(userId);
  await getDocumentFilesTable(db).clear();
};
