import { parse, resolve } from 'node:path';

import { parseUniversalId } from '@affine/nbstore';
import fs from 'fs-extra';
import { nanoid } from 'nanoid';

import { isPathInsideBase } from '../../shared/utils';
import { logger } from '../logger';
import { mainRPC } from '../main-rpc';
import { getDocStoragePool } from '../nbstore';
import { storeWorkspaceMeta } from '../workspace';
import {
  getSpaceDBPath,
  getWorkspaceDBPath,
  getWorkspacesBasePath,
} from '../workspace/meta';

type NativeModule = typeof import('@affine/native');

export type ErrorMessage =
  | 'DB_FILE_PATH_INVALID'
  | 'DB_FILE_INVALID'
  | 'UNKNOWN_ERROR';

export interface LoadDBFileResult {
  workspaceId?: string;
  error?: ErrorMessage;
  canceled?: boolean;
}

export interface SaveDBFileResult {
  filePath?: string;
  canceled?: boolean;
  error?: ErrorMessage;
}

export interface SelectDBFileLocationResult {
  filePath?: string;
  error?: ErrorMessage;
  canceled?: boolean;
}

const extension = 'affine';
const NATIVE_LOAD_ERROR_MESSAGE =
  'ネイティブ依存が不足しているためDBファイルを処理できません。node_modules を削除して npm install を実行してください。';

async function loadNativeModule(): Promise<NativeModule> {
  try {
    return await import('@affine/native');
  } catch (err) {
    logger.error(NATIVE_LOAD_ERROR_MESSAGE, err);
    throw new Error(NATIVE_LOAD_ERROR_MESSAGE);
  }
}

function getDefaultDBFileName(name: string, id: string) {
  const fileName = `${name}_${id}.${extension}`;
  // ファイル名として使えない文字は置換する。
  return fileName.replace(/[/\\?%*:|"<>]/g, '-');
}

async function resolveExistingPath(path: string) {
  if (!(await fs.pathExists(path))) {
    return null;
  }
  try {
    return await fs.realpath(path);
  } catch {
    return resolve(path);
  }
}

async function isSameFilePath(sourcePath: string, targetPath: string) {
  if (resolve(sourcePath) === resolve(targetPath)) {
    return true;
  }

  const [resolvedSourcePath, resolvedTargetPath] = await Promise.all([
    resolveExistingPath(sourcePath),
    resolveExistingPath(targetPath),
  ]);

  return !!resolvedSourcePath && resolvedSourcePath === resolvedTargetPath;
}

async function normalizeImportDBPath(selectedPath: string) {
  if (!(await fs.pathExists(selectedPath))) {
    return null;
  }

  const [normalizedPath, workspacesBasePath] = await Promise.all([
    resolveExistingPath(selectedPath),
    resolveExistingPath(await getWorkspacesBasePath()),
  ]);
  const resolvedSelectedPath = normalizedPath ?? resolve(selectedPath);
  const resolvedWorkspacesBasePath =
    workspacesBasePath ?? resolve(await getWorkspacesBasePath());

  if (isPathInsideBase(resolvedWorkspacesBasePath, resolvedSelectedPath)) {
    logger.warn('loadDBFile: db file in app data dir');
    return null;
  }

  return resolvedSelectedPath;
}

/**
 * 「ワークスペースを保存」ダイアログの保存ボタンから呼ばれる。
 * 指定された場所へ、圧縮済みのデータベースファイルを書き出す。
 */
export async function saveDBFileAs(
  universalId: string,
  name: string
): Promise<SaveDBFileResult> {
  try {
    const { peer, type, id } = parseUniversalId(universalId);
    const dbPath = await getSpaceDBPath(peer, type, id);

    // DBプールへ接続し、WAL の内容をDBファイルへ反映してから保存する。
    const pool = await getDocStoragePool();
    await pool.connect(universalId, dbPath);
    await pool.checkpoint(universalId);

    if (!dbPath) {
      return {
        error: 'DB_FILE_PATH_INVALID',
      };
    }

    const ret = await mainRPC.showSaveDialog({
      properties: ['showOverwriteConfirmation'],
      title: 'Save Workspace',
      showsTagField: false,
      buttonLabel: 'Save',
      filters: [
        {
          extensions: [extension],
          name: '',
        },
      ],
      defaultPath: getDefaultDBFileName(name, id),
      message: 'Save Workspace as a SQLite Database file',
    });

    const filePath = ret.filePath;
    if (ret.canceled || !filePath) {
      return { canceled: true };
    }

    if (await isSameFilePath(dbPath, filePath)) {
      return { error: 'DB_FILE_PATH_INVALID' };
    }

    const tempFilePath = `${filePath}.${nanoid(6)}.tmp`;
    if (await fs.pathExists(tempFilePath)) {
      await fs.remove(tempFilePath);
    }

    try {
      await pool.vacuumInto(universalId, tempFilePath);
      await fs.move(tempFilePath, filePath, { overwrite: true });
    } finally {
      if (await fs.pathExists(tempFilePath)) {
        await fs.remove(tempFilePath);
      }
    }
    logger.log('saved', filePath);
    mainRPC.showItemInFolder(filePath).catch(err => {
      console.error(err);
    });
    return { filePath };
  } catch (err) {
    logger.error('saveDBFileAs', err);
    return {
      error: 'UNKNOWN_ERROR',
    };
  }
}

export async function selectDBFileLocation(): Promise<SelectDBFileLocationResult> {
  try {
    const ret = await mainRPC.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Set Workspace Storage Location',
      buttonLabel: 'Select',
      defaultPath: await mainRPC.getPath('documents'),
      message: "Select a location to store the workspace's database file",
    });
    const dir = ret.filePaths?.[0];
    if (ret.canceled || !dir) {
      return {
        canceled: true,
      };
    }
    return { filePath: dir };
  } catch (err) {
    logger.error('selectDBFileLocation', err);
    return {
      error: (err as any).message,
    };
  }
}

/**
 * 「ワークスペースを読み込む」ボタンから呼ばれる。
 * 選択されたDBファイルをアプリ内部の保存先へ取り込み、新しいワークスペースIDを返す。
 */
export async function loadDBFile(): Promise<LoadDBFileResult> {
  try {
    const ret = await mainRPC.showOpenDialog({
      properties: ['openFile'],
      title: 'Load Workspace',
      buttonLabel: 'Load',
      filters: [
        {
          name: 'SQLite Database',
          // 必要なら将来ほかの形式も追加する。
          extensions: ['db', 'affine'],
        },
      ],
      message: 'Load Workspace from a AFFiNE file',
    });
    const selectedPath = ret.filePaths?.[0];
    if (ret.canceled || !selectedPath) {
      logger.info('loadDBFile canceled');
      return { canceled: true };
    }

    const originalPath = await normalizeImportDBPath(selectedPath);
    if (!originalPath) {
      return { error: 'DB_FILE_PATH_INVALID' };
    }

    const { DocStorage } = await loadNativeModule();
    const workspaceId = nanoid(10);
    let storage = new DocStorage(originalPath);

    // v2 として読めないDBは v1 DB として扱う。
    if (!(await storage.validate())) {
      return await cpV1DBFile(originalPath, workspaceId);
    }

    if (!(await storage.validateImportSchema())) {
      return { error: 'DB_FILE_INVALID' };
    }

    // v2 の取り込み処理。
    const internalFilePath = await getSpaceDBPath(
      'local',
      'workspace',
      workspaceId
    );
    await fs.ensureDir(parse(internalFilePath).dir);
    await storage.vacuumInto(internalFilePath);
    logger.info(`loadDBFile, vacuum: ${originalPath} -> ${internalFilePath}`);

    storage = new DocStorage(internalFilePath);
    await storage.setSpaceId(workspaceId);

    return {
      workspaceId,
    };
  } catch (err) {
    logger.error('loadDBFile', err);
    return {
      error: 'UNKNOWN_ERROR',
    };
  }
}

async function cpV1DBFile(
  originalPath: string,
  workspaceId: string
): Promise<LoadDBFileResult> {
  const { SqliteConnection, ValidationResult } = await loadNativeModule();

  const validationResult = await SqliteConnection.validate(originalPath);

  if (validationResult !== ValidationResult.Valid) {
    return { error: 'DB_FILE_INVALID' };
  }

  const connection = new SqliteConnection(originalPath);
  try {
    if (!(await connection.validateImportSchema())) {
      return { error: 'DB_FILE_INVALID' };
    }

    const internalFilePath = await getWorkspaceDBPath('workspace', workspaceId);

    await fs.ensureDir(parse(internalFilePath).dir);
    await connection.vacuumInto(internalFilePath);
    logger.info(`loadDBFile, vacuum: ${originalPath} -> ${internalFilePath}`);

    await storeWorkspaceMeta(workspaceId, {
      id: workspaceId,
      mainDBPath: internalFilePath,
    });

    return {
      workspaceId,
    };
  } finally {
    await connection.close();
  }
}
