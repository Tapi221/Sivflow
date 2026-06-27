import { AffineSchemas } from '@blocksuite/affine/schemas';
import { replaceIdMiddleware } from '@blocksuite/affine/shared/adapters';
import { Schema, Transformer } from '@blocksuite/store';
import type { DocSnapshot, Workspace } from '@blocksuite/store';

export const importFromSnapshot = async (collection: Workspace, snapshot: DocSnapshot) => {
  const job = new Transformer({
    schema: new Schema().register(AffineSchemas),
    blobCRUD: collection.blobSync,
    docCRUD: {
      create: (id: string) => collection.createDoc(id).getStore({ id }),
      get: (id: string) => collection.getDoc(id)?.getStore({ id }) ?? null,
      delete: (id: string) => collection.removeDoc(id),
    },
    middlewares: [replaceIdMiddleware(collection.idGenerator)],
  });

  return job.snapshotToDoc(snapshot);
};
