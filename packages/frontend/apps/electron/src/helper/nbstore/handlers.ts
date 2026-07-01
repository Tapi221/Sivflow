import path from 'node:path';

import type { DocStoragePool } from '@affine/native';
import { parseUniversalId } from '@affine/nbstore';
import type { NativeDBApis } from '@affine/nbstore/sqlite';
import fs from 'fs-extra';

import { logger } from '../logger';
import { getSpaceDBPath } from '../workspace/meta';

const NATIVE_LOAD_ERROR_MESSAGE =
  'ネイティブ依存が不足しているためローカルDBを開けません。node_modules を削除して npm install を実行してください。';

let pool: DocStoragePool | undefined;

export async function getDocStoragePool() {
  if (pool) {
    return pool;
  }

  try {
    const { DocStoragePool } = await import('@affine/native');
    pool = new DocStoragePool();
    return pool;
  } catch (err) {
    logger.error(NATIVE_LOAD_ERROR_MESSAGE, err);
    throw new Error(NATIVE_LOAD_ERROR_MESSAGE);
  }
}

async function callPoolMethod(method: keyof DocStoragePool, ...args: any[]): Promise<any> {
  const pool = await getDocStoragePool();
  const handler = pool[method];

  if (typeof handler !== 'function') {
    throw new Error(`未対応のローカルDB操作です: ${String(method)}`);
  }

  return (handler as any).apply(pool, args);
}

const poolHandler = (method: keyof DocStoragePool) => {
  return async (...args: any[]): Promise<any> => callPoolMethod(method, ...args);
};

export const nbstoreHandlers = {
  connect: async (universalId: string) => {
    const { peer, type, id } = parseUniversalId(universalId);
    const dbPath = await getSpaceDBPath(peer, type, id);
    const pool = await getDocStoragePool();
    await fs.ensureDir(path.dirname(dbPath));
    await pool.connect(universalId, dbPath);
    await pool.setSpaceId(universalId, id);
  },
  disconnect: poolHandler('disconnect'),
  pushUpdate: poolHandler('pushUpdate'),
  getDocSnapshot: poolHandler('getDocSnapshot'),
  setDocSnapshot: poolHandler('setDocSnapshot'),
  getDocUpdates: poolHandler('getDocUpdates'),
  markUpdatesMerged: poolHandler('markUpdatesMerged'),
  deleteDoc: poolHandler('deleteDoc'),
  getDocClocks: poolHandler('getDocClocks'),
  getDocClock: poolHandler('getDocClock'),
  getDocIndexedClock: poolHandler('getDocIndexedClock'),
  setDocIndexedClock: poolHandler('setDocIndexedClock'),
  clearDocIndexedClock: poolHandler('clearDocIndexedClock'),
  getBlob: poolHandler('getBlob'),
  setBlob: poolHandler('setBlob'),
  deleteBlob: poolHandler('deleteBlob'),
  releaseBlobs: poolHandler('releaseBlobs'),
  listBlobs: poolHandler('listBlobs'),
  getPeerRemoteClocks: poolHandler('getPeerRemoteClocks'),
  getPeerRemoteClock: poolHandler('getPeerRemoteClock'),
  setPeerRemoteClock: poolHandler('setPeerRemoteClock'),
  getPeerPulledRemoteClocks: poolHandler('getPeerPulledRemoteClocks'),
  getPeerPulledRemoteClock: poolHandler('getPeerPulledRemoteClock'),
  setPeerPulledRemoteClock: poolHandler('setPeerPulledRemoteClock'),
  getPeerPushedClocks: poolHandler('getPeerPushedClocks'),
  getPeerPushedClock: poolHandler('getPeerPushedClock'),
  setPeerPushedClock: poolHandler('setPeerPushedClock'),
  clearClocks: poolHandler('clearClocks'),
  setBlobUploadedAt: poolHandler('setBlobUploadedAt'),
  getBlobUploadedAt: poolHandler('getBlobUploadedAt'),
  crawlDocData: poolHandler('crawlDocData'),
  ftsAddDocument: poolHandler('ftsAddDocument'),
  ftsDeleteDocument: poolHandler('ftsDeleteDocument'),
  ftsSearch: poolHandler('ftsSearch'),
  ftsGetDocument: poolHandler('ftsGetDocument'),
  ftsGetMatches: poolHandler('ftsGetMatches'),
  ftsFlushIndex: poolHandler('ftsFlushIndex'),
  ftsIndexVersion: poolHandler('ftsIndexVersion'),
} satisfies NativeDBApis;
