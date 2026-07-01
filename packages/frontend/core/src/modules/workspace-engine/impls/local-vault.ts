/**
 * local-vault.ts
 *
 * local-vault flavour の WorkspaceFlavourProvider 実装。
 * ユーザーが選択したローカルフォルダ（Vault）へデータを保存する。
 *
 * 設計方針:
 * - 既存の `local` flavour (SQLite) はそのまま存在し続ける
 * - local-vault は追加の保存モードとして独立して動作する
 * - 内部の YDoc / SQLite は既存のパスに保存（getSpaceDBPath 使用）
 * - Vault フォルダには人間可読な Markdown と vault.json を保存する
 * - workspaceId と vaultPath のマッピングは globalState で管理する
 */

import { toArrayBuffer } from '@affine/core/utils/array-buffer';
import { DebugLogger } from '@affine/debug';
import {
  type BlobStorage,
  type DocStorage,
  type ListedBlobRecord,
  universalId,
} from '@affine/nbstore';
import {
  SqliteBlobStorage,
  SqliteBlobSyncStorage,
  SqliteDocStorage,
  SqliteDocSyncStorage,
  SqliteIndexerStorage,
  SqliteIndexerSyncStorage,
} from '@affine/nbstore/sqlite';
import {
  SqliteV1BlobStorage,
  SqliteV1DocStorage,
} from '@affine/nbstore/sqlite/v1';
import type { WorkerInitOptions } from '@affine/nbstore/worker/client';
import type { FrameworkProvider } from '@toeverything/infra';
import { LiveData, Service } from '@toeverything/infra';
import { isEqual } from 'lodash-es';
import { nanoid } from 'nanoid';
import { Observable } from 'rxjs';
import { Doc as YDoc, encodeStateAsUpdate } from 'yjs';

import { DesktopApiService } from '../../desktop-api';
import type {
  WorkspaceFlavourProvider,
  WorkspaceFlavoursProvider,
  WorkspaceMetadata,
  WorkspaceProfileInfo,
} from '../../workspace';
import { WorkspaceImpl } from '../../workspace/impls/workspace';
import { getWorkspaceProfileWorker } from './out-worker';
import {
  dedupeWorkspaceIds,
  normalizeWorkspaceIds,
} from './workspace-id-utils';

const logger = new DebugLogger('local-vault-workspace');

export const LOCAL_VAULT_GLOBAL_STATE_KEY =
  'workspace-engine:local-vault-workspace-ids:v1';

// workspaceId → vaultPath のマッピングを globalState に保存するキー
export const LOCAL_VAULT_PATHS_KEY =
  'workspace-engine:local-vault-paths:v1';

const LOCAL_VAULT_CHANGED_BROADCAST_CHANNEL_KEY =
  'affine-local-vault-workspace-changed';

// ────────────────────────────────────────────────────────────
// GlobalState ヘルパー
// ────────────────────────────────────────────────────────────

type GlobalStateStorageLike = {
  ready: Promise<void>;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
};

function getElectronGlobalStateStorage(): GlobalStateStorageLike | null {
  const sharedStorage = (
    globalThis as {
      __sharedStorage?: { globalState?: GlobalStateStorageLike };
    }
  ).__sharedStorage;
  return sharedStorage?.globalState ?? null;
}

function getLocalVaultWorkspaceIds(): string[] {
  const globalState = getElectronGlobalStateStorage();
  if (!globalState) return [];
  return normalizeWorkspaceIds(
    globalState.get<string[]>(LOCAL_VAULT_GLOBAL_STATE_KEY)
  );
}

function setLocalVaultWorkspaceIds(
  idsOrUpdater: string[] | ((ids: string[]) => string[])
) {
  const next = normalizeWorkspaceIds(
    typeof idsOrUpdater === 'function'
      ? idsOrUpdater(getLocalVaultWorkspaceIds())
      : idsOrUpdater
  );
  const deduplicated = dedupeWorkspaceIds(next);
  const globalState = getElectronGlobalStateStorage();
  if (globalState) {
    globalState.set(LOCAL_VAULT_GLOBAL_STATE_KEY, deduplicated);
  }
}

function getLocalVaultPaths(): Record<string, string> {
  const globalState = getElectronGlobalStateStorage();
  if (!globalState) return {};
  return globalState.get<Record<string, string>>(LOCAL_VAULT_PATHS_KEY) ?? {};
}

function setLocalVaultPath(workspaceId: string, vaultPath: string) {
  const globalState = getElectronGlobalStateStorage();
  if (!globalState) return;
  const paths = getLocalVaultPaths();
  paths[workspaceId] = vaultPath;
  globalState.set(LOCAL_VAULT_PATHS_KEY, paths);
}

export function getVaultPathForWorkspace(
  workspaceId: string
): string | undefined {
  return getLocalVaultPaths()[workspaceId];
}

// ────────────────────────────────────────────────────────────
// LocalVaultWorkspaceFlavourProvider
// ────────────────────────────────────────────────────────────

class LocalVaultWorkspaceFlavourProvider implements WorkspaceFlavourProvider {
  constructor(private readonly framework: FrameworkProvider) {}

  readonly flavour = 'local-vault';

  readonly notifyChannel = new BroadcastChannel(
    LOCAL_VAULT_CHANGED_BROADCAST_CHANNEL_KEY
  );

  // Electron では常に SQLite を使用
  DocStorageType = SqliteDocStorage;
  DocStorageV1Type = SqliteV1DocStorage;
  BlobStorageType = SqliteBlobStorage;
  BlobStorageV1Type = SqliteV1BlobStorage;
  DocSyncStorageType = SqliteDocSyncStorage;
  BlobSyncStorageType = SqliteBlobSyncStorage;
  IndexerStorageType = SqliteIndexerStorage;
  IndexerSyncStorageType = SqliteIndexerSyncStorage;

  async deleteWorkspace(id: string): Promise<void> {
    setLocalVaultWorkspaceIds(ids => ids.filter(x => x !== id));

    const electronApi = this.framework.get(DesktopApiService);
    try {
      await electronApi.handler.workspace.moveToTrash(
        universalId({ peer: 'local', type: 'workspace', id })
      );
    } catch (e) {
      logger.error('deleteWorkspace: moveToTrash failed', e);
    }

    // vaultPath マッピングも削除
    const paths = getLocalVaultPaths();
    delete paths[id];
    const globalState = getElectronGlobalStateStorage();
    if (globalState) {
      globalState.set(LOCAL_VAULT_PATHS_KEY, paths);
    }

    this.notifyChannel.postMessage(id);
  }

  async createWorkspace(
    initial: (
      docCollection: WorkspaceImpl,
      blobStorage: BlobStorage,
      docStorage: DocStorage
    ) => Promise<void>
  ): Promise<WorkspaceMetadata> {
    const electronApi = this.framework.get(DesktopApiService);

    // ── Step 1: Vault フォルダをユーザーに選ばせる ──
    let vaultPath: string;
    try {
      const result = await electronApi.handler.vault.selectVaultDirectory();
      if (result.canceled || !result.vaultPath) {
        throw new Error('Vault directory selection was canceled by user');
      }
      vaultPath = result.vaultPath;
    } catch (e) {
      logger.error('createWorkspace: selectVaultDirectory failed', e);
      throw e;
    }

    const id = nanoid();

    // ── Step 2: 内部 SQLite ストレージを初期化 ──
    const docStorage = new this.DocStorageType({
      id,
      flavour: 'local',
      type: 'workspace',
    });
    docStorage.connection.connect();
    await docStorage.connection.waitForConnected();

    const blobStorage = new this.BlobStorageType({
      id,
      flavour: 'local',
      type: 'workspace',
    });
    blobStorage.connection.connect();
    await blobStorage.connection.waitForConnected();

    const docList = new Set<YDoc>();

    const docCollection = new WorkspaceImpl({
      id,
      rootDoc: new YDoc({ guid: id }),
      blobSource: {
        get: async key => {
          const record = await blobStorage.get(key);
          return record
            ? new Blob([toArrayBuffer(record.data)], { type: record.mime })
            : null;
        },
        delete: async () => {
          return;
        },
        list: async () => {
          return [];
        },
        set: async (blobId, blob) => {
          await blobStorage.set({
            key: blobId,
            data: new Uint8Array(await blob.arrayBuffer()),
            mime: blob.type,
          });
          return blobId;
        },
        name: 'blob',
        readonly: false,
      },
      onLoadDoc(doc) {
        docList.add(doc);
      },
    });

    try {
      // ── Step 3: 初期データを投入 ──
      await initial(docCollection, blobStorage, docStorage);

      for (const subdoc of docList) {
        await docStorage.pushDocUpdate({
          docId: subdoc.guid,
          bin: encodeStateAsUpdate(subdoc),
        });
      }

      docStorage.connection.disconnect();
      blobStorage.connection.disconnect();

      // ── Step 4: Vault フォルダを初期化 ──
      const workspaceName =
        (docCollection.meta as any)?.name ?? 'My Vault';
      const initResult = await electronApi.handler.vault.initVault(
        vaultPath,
        id,
        workspaceName
      );
      if (!initResult.success) {
        logger.warn('createWorkspace: initVault failed', initResult.error);
        // Vault 初期化失敗はエラーとしない（SQLite は正常に作成済み）
      }

      // ── Step 5: ID と vaultPath を永続化 ──
      setLocalVaultWorkspaceIds(ids => [...ids, id]);
      setLocalVaultPath(id, vaultPath);

      this.notifyChannel.postMessage(id);
    } finally {
      docCollection.dispose();
    }

    return { id, flavour: 'local-vault', localVaultPath: vaultPath };
  }

  workspaces$ = LiveData.from(
    new Observable<WorkspaceMetadata[]>(subscriber => {
      let last: WorkspaceMetadata[] | null = null;

      const emit = () => {
        const ids = getLocalVaultWorkspaceIds();
        const paths = getLocalVaultPaths();
        const value: WorkspaceMetadata[] = ids.map(wsId => ({
          id: wsId,
          flavour: 'local-vault',
          localVaultPath: paths[wsId],
        }));
        if (isEqual(last, value)) return;
        subscriber.next(value);
        last = value;
      };

      emit();

      const channel = new BroadcastChannel(
        LOCAL_VAULT_CHANGED_BROADCAST_CHANNEL_KEY
      );
      channel.addEventListener('message', emit);

      return () => {
        channel.removeEventListener('message', emit);
        channel.close();
      };
    }),
    []
  );

  isRevalidating$ = new LiveData(false);

  revalidate(): void {
    this.notifyChannel.postMessage(null);
  }

  async getWorkspaceProfile(
    id: string
  ): Promise<WorkspaceProfileInfo | undefined> {
    const docStorage = new this.DocStorageType({
      id,
      flavour: 'local',
      type: 'workspace',
      readonlyMode: true,
    });
    docStorage.connection.connect();
    await docStorage.connection.waitForConnected();
    const localData = await docStorage.getDoc(id);
    docStorage.connection.disconnect();

    if (!localData) {
      return { isOwner: true };
    }

    const client = getWorkspaceProfileWorker();
    const result = await client.call(
      'renderWorkspaceProfile',
      [localData.bin].filter(Boolean) as Uint8Array[]
    );

    return {
      name: result.name,
      avatar: result.avatar,
      isOwner: true,
    };
  }

  async getWorkspaceBlob(id: string, blobKey: string): Promise<Blob | null> {
    const storage = new this.BlobStorageType({
      id,
      flavour: 'local',
      type: 'workspace',
    });
    storage.connection.connect();
    await storage.connection.waitForConnected();
    const blob = await storage.get(blobKey);
    return blob
      ? new Blob([toArrayBuffer(blob.data)], { type: blob.mime })
      : null;
  }

  async listBlobs(id: string): Promise<ListedBlobRecord[]> {
    const storage = new this.BlobStorageType({
      id,
      flavour: 'local',
      type: 'workspace',
    });
    storage.connection.connect();
    await storage.connection.waitForConnected();
    return storage.list();
  }

  async deleteBlob(
    id: string,
    blob: string,
    permanent: boolean
  ): Promise<void> {
    const storage = new this.BlobStorageType({
      id,
      flavour: 'local',
      type: 'workspace',
    });
    storage.connection.connect();
    await storage.connection.waitForConnected();
    await storage.delete(blob, permanent);
  }

  getEngineWorkerInitOptions(workspaceId: string): WorkerInitOptions {
    // local-vault は内部 SQLite は 'local' peer として扱う
    return {
      local: {
        doc: {
          name: this.DocStorageType.identifier,
          opts: {
            flavour: 'local',
            type: 'workspace',
            id: workspaceId,
          },
        },
        blob: {
          name: this.BlobStorageType.identifier,
          opts: {
            flavour: 'local',
            type: 'workspace',
            id: workspaceId,
          },
        },
        blobSync: {
          name: this.BlobSyncStorageType.identifier,
          opts: {
            flavour: 'local',
            type: 'workspace',
            id: workspaceId,
          },
        },
        docSync: {
          name: this.DocSyncStorageType.identifier,
          opts: {
            flavour: 'local',
            type: 'workspace',
            id: workspaceId,
          },
        },
        awareness: {
          name: 'BroadcastChannelAwarenessStorage',
          opts: {
            id: workspaceId,
          },
        },
        indexer: {
          name: this.IndexerStorageType.identifier,
          opts: {
            flavour: 'local',
            type: 'workspace',
            id: workspaceId,
          },
        },
        indexerSync: {
          name: this.IndexerSyncStorageType.identifier,
          opts: {
            flavour: 'local',
            type: 'workspace',
            id: workspaceId,
          },
        },
      },
      remotes: {
        v1: {
          doc: this.DocStorageV1Type
            ? {
                name: this.DocStorageV1Type.identifier,
                opts: {
                  id: workspaceId,
                  type: 'workspace',
                },
              }
            : undefined,
          blob: this.BlobStorageV1Type
            ? {
                name: this.BlobStorageV1Type.identifier,
                opts: {
                  id: workspaceId,
                  type: 'workspace',
                },
              }
            : undefined,
        },
      },
    };
  }
}

// ────────────────────────────────────────────────────────────
// LocalVaultWorkspaceFlavoursProvider
// ────────────────────────────────────────────────────────────

export class LocalVaultWorkspaceFlavoursProvider
  extends Service
  implements WorkspaceFlavoursProvider
{
  constructor() {
    super();
  }

  workspaceFlavours$ = new LiveData<WorkspaceFlavourProvider[]>([
    new LocalVaultWorkspaceFlavourProvider(this.framework),
  ]);
}
