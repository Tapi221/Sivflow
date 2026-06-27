import { createStore, del, get, keys, set } from 'idb-keyval';

import type { BlobSource } from '../source.js';

export class IndexedDBBlobSource implements BlobSource {
  readonly mimeTypeStore: ReturnType<typeof createStore>;

  readonly = false;

  readonly store: ReturnType<typeof createStore>;

  constructor(readonly name: string) {
    this.mimeTypeStore = createStore(`${this.name}_blob_mime`, 'blob_mime');
    this.store = createStore(`${this.name}_blob`, 'blob');
  }

  async delete(key: string) {
    await del(key, this.store);
    await del(key, this.mimeTypeStore);
  }

  async get(key: string) {
    const res = await get<ArrayBuffer>(key, this.store);
    if (res) {
      return new Blob([res], {
        type: await get(key, this.mimeTypeStore),
      });
    }
    return null;
  }

  async list() {
    const list = await keys<string>(this.store);
    return list;
  }

  async set(key: string, value: Blob) {
    await set(key, await value.arrayBuffer(), this.store);
    await set(key, value.type, this.mimeTypeStore);
    return key;
  }
}
