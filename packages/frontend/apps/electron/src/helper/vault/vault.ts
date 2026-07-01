/**
 * vault.ts
 *
 * local-vault 機能のコアロジック。
 * - ユーザーがフォルダを選択して Vault を初期化する
 * - pages/, assets/, .sivflow/ ディレクトリ構造を作成する
 * - .sivflow/vault.json を管理する
 * - Markdown ファイルを pages/{slug}.md に書き出す
 *
 * セキュリティ: path traversal を防ぐため、書き込み先は必ず
 * selectedVaultPath の配下であることを検証する。
 */

import path from 'node:path';

import fs from 'fs-extra';

import { isPathInsideBase } from '../../shared/utils';
import { logger } from '../logger';
import { mainRPC } from '../main-rpc';

// ────────────────────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────────────────────

export interface VaultJson {
  version: number;
  workspaceId: string;
  name: string;
  createdAt: string;
}

export interface PageIndexEntry {
  id: string;
  slug: string;
  title: string;
  updatedAt: string;
}

export interface SelectVaultDirectoryResult {
  vaultPath?: string;
  canceled?: boolean;
  error?: string;
}

export interface InitVaultResult {
  success: boolean;
  error?: string;
}

export interface WriteMarkdownResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface GetVaultMetaResult {
  vault?: VaultJson;
  pageIndex?: PageIndexEntry[];
  error?: string;
}

// ────────────────────────────────────────────────────────────
// 定数
// ────────────────────────────────────────────────────────────

const SIVFLOW_DIR = '.sivflow';
const VAULT_JSON = 'vault.json';
const PAGES_JSON = 'pages.json';
const PAGES_DIR = 'pages';
const ASSETS_DIR = 'assets';
const YDOCS_DIR = 'ydocs';

// Windows・macOS・Linux で使えない文字（ファイル名禁止文字）
const UNSAFE_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;
const RESERVED_WINDOWS_NAMES =
  /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(\..*)?$/i;

// ────────────────────────────────────────────────────────────
// ヘルパー関数
// ────────────────────────────────────────────────────────────

/**
 * ページタイトルからファイルシステムで安全な slug を生成する。
 * Windows の禁止文字・予約名を避ける。
 */
export function generateSlug(title: string): string {
  if (!title || title.trim().length === 0) {
    return 'untitled';
  }

  const slug = title
    .trim()
    .toLowerCase()
    // Windows 禁止文字と制御文字を削除
    .replace(UNSAFE_FILENAME_CHARS, '-')
    // スペースをハイフンに変換
    .replace(/\s+/g, '-')
    // 複数のハイフンを一つに
    .replace(/-+/g, '-')
    // 先頭・末尾のハイフンを削除
    .replace(/^-+|-+$/g, '');

  // Windows 予約名の場合は prefix を付与
  if (RESERVED_WINDOWS_NAMES.test(slug)) {
    return `page-${slug}`;
  }

  // 空になった場合のフォールバック
  return slug || 'untitled';
}

/**
 * vaultPath 配下の絶対パスを安全に構築する（path traversal 防止）。
 */
function safeJoin(vaultPath: string, ...parts: string[]): string | null {
  const joined = path.resolve(vaultPath, ...parts);
  if (!isPathInsideBase(vaultPath, joined)) {
    logger.error(
      `safeJoin: path traversal detected: ${joined} is not inside ${vaultPath}`
    );
    return null;
  }
  return joined;
}

// ────────────────────────────────────────────────────────────
// vault.json / pages.json の読み書き
// ────────────────────────────────────────────────────────────

async function readVaultJson(vaultPath: string): Promise<VaultJson | null> {
  const p = safeJoin(vaultPath, SIVFLOW_DIR, VAULT_JSON);
  if (!p) return null;
  try {
    return (await fs.readJSON(p)) as VaultJson;
  } catch {
    return null;
  }
}

async function writeVaultJson(
  vaultPath: string,
  data: VaultJson
): Promise<void> {
  const p = safeJoin(vaultPath, SIVFLOW_DIR, VAULT_JSON);
  if (!p) throw new Error('Invalid vault path');
  await fs.writeJSON(p, data, { spaces: 2 });
}

async function readPagesJson(
  vaultPath: string
): Promise<PageIndexEntry[] | null> {
  const p = safeJoin(vaultPath, SIVFLOW_DIR, PAGES_JSON);
  if (!p) return null;
  try {
    return (await fs.readJSON(p)) as PageIndexEntry[];
  } catch {
    return null;
  }
}

async function writePagesJson(
  vaultPath: string,
  pages: PageIndexEntry[]
): Promise<void> {
  const p = safeJoin(vaultPath, SIVFLOW_DIR, PAGES_JSON);
  if (!p) throw new Error('Invalid vault path');
  await fs.writeJSON(p, pages, { spaces: 2 });
}

// ────────────────────────────────────────────────────────────
// 公開 API
// ────────────────────────────────────────────────────────────

/**
 * フォルダ選択ダイアログを表示して vault の保存先を選ばせる。
 */
export async function selectVaultDirectory(): Promise<SelectVaultDirectoryResult> {
  try {
    const result = await mainRPC.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'ローカル Vault の保存先を選択',
      buttonLabel: '保存先として選択',
      defaultPath: await mainRPC.getPath('documents'),
      message: 'Sivflow Vault として使用するフォルダを選択してください',
    });

    if (result.canceled || !result.filePaths?.[0]) {
      return { canceled: true };
    }

    const vaultPath = result.filePaths[0];
    return { vaultPath };
  } catch (err) {
    logger.error('selectVaultDirectory', err);
    return { error: (err as Error).message };
  }
}

/**
 * Vault フォルダを初期化する。
 * pages/, assets/, .sivflow/, .sivflow/ydocs/ を作成し、
 * vault.json / pages.json を書き出す。
 */
export async function initVault(
  vaultPath: string,
  workspaceId: string,
  workspaceName: string
): Promise<InitVaultResult> {
  try {
    // ディレクトリが存在しない場合は拒否（存在するフォルダを選ばせる）
    if (!(await fs.pathExists(vaultPath))) {
      return { success: false, error: 'Vault directory does not exist' };
    }

    // 必要なサブディレクトリを作成
    const dirsToCreate = [
      safeJoin(vaultPath, PAGES_DIR),
      safeJoin(vaultPath, ASSETS_DIR),
      safeJoin(vaultPath, SIVFLOW_DIR),
      safeJoin(vaultPath, SIVFLOW_DIR, YDOCS_DIR),
    ];

    for (const dir of dirsToCreate) {
      if (!dir) {
        return { success: false, error: 'Invalid vault path (path traversal)' };
      }
      await fs.ensureDir(dir);
    }

    // vault.json を作成（既存の場合は上書きしない）
    const existingVault = await readVaultJson(vaultPath);
    if (!existingVault) {
      const vault: VaultJson = {
        version: 1,
        workspaceId,
        name: workspaceName,
        createdAt: new Date().toISOString(),
      };
      await writeVaultJson(vaultPath, vault);
    }

    // pages.json を作成（既存の場合は上書きしない）
    const existingPages = await readPagesJson(vaultPath);
    if (!existingPages) {
      await writePagesJson(vaultPath, []);
    }

    logger.info('initVault: vault initialized at', vaultPath);
    return { success: true };
  } catch (err) {
    logger.error('initVault', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Markdown ファイルを pages/{slug}.md に書き出す。
 * slug が衝突する場合は pages/{slug}-{docId}.md にフォールバック。
 * 既存ファイルは上書き。
 */
export async function writeMarkdownPage(
  vaultPath: string,
  docId: string,
  title: string,
  markdownContent: string
): Promise<WriteMarkdownResult> {
  try {
    if (!(await fs.pathExists(vaultPath))) {
      return { success: false, error: 'Vault directory does not exist' };
    }

    const slug = generateSlug(title);
    const pagesDir = safeJoin(vaultPath, PAGES_DIR);
    if (!pagesDir) {
      return {
        success: false,
        error: 'Invalid vault path (path traversal detected)',
      };
    }
    await fs.ensureDir(pagesDir);

    // slug が他の docId に対応するファイルと衝突しないか確認
    const primaryPath = safeJoin(vaultPath, PAGES_DIR, `${slug}.md`);
    if (!primaryPath) {
      return {
        success: false,
        error: 'Invalid vault path (path traversal detected)',
      };
    }

    // pages.json を確認して衝突を解決
    const pages = (await readPagesJson(vaultPath)) ?? [];
    const existingEntry = pages.find(p => p.id === docId);
    const conflictEntry = pages.find(p => p.slug === slug && p.id !== docId);

    let finalSlug: string;
    let finalPath: string;

    if (conflictEntry) {
      // slug が他の docId に使われている場合は docId を suffix に使う
      const shortId = docId.slice(0, 8);
      finalSlug = `${slug}-${shortId}`;
      const p = safeJoin(vaultPath, PAGES_DIR, `${finalSlug}.md`);
      if (!p) {
        return {
          success: false,
          error: 'Invalid vault path (path traversal detected)',
        };
      }
      finalPath = p;
    } else {
      finalSlug = existingEntry?.slug ?? slug;
      finalPath = primaryPath;
    }

    // Markdown を書き出し
    await fs.writeFile(finalPath, markdownContent, 'utf-8');

    // pages.json を更新
    const now = new Date().toISOString();
    if (existingEntry) {
      existingEntry.slug = finalSlug;
      existingEntry.title = title;
      existingEntry.updatedAt = now;
    } else {
      pages.push({ id: docId, slug: finalSlug, title, updatedAt: now });
    }
    await writePagesJson(vaultPath, pages);

    logger.info(`writeMarkdownPage: wrote ${finalPath}`);
    return { success: true, filePath: finalPath };
  } catch (err) {
    logger.error('writeMarkdownPage', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * vault.json と pages.json を読み込んで返す。
 */
export async function getVaultMeta(
  vaultPath: string
): Promise<GetVaultMetaResult> {
  try {
    const [vault, pageIndex] = await Promise.all([
      readVaultJson(vaultPath),
      readPagesJson(vaultPath),
    ]);
    return { vault: vault ?? undefined, pageIndex: pageIndex ?? undefined };
  } catch (err) {
    logger.error('getVaultMeta', err);
    return { error: (err as Error).message };
  }
}

/**
 * 指定パスが有効な Vault ディレクトリかどうかを検証する。
 * vault.json が存在すれば true。
 */
export async function isValidVaultPath(vaultPath: string): Promise<boolean> {
  const p = safeJoin(vaultPath, SIVFLOW_DIR, VAULT_JSON);
  if (!p) return false;
  return fs.pathExists(p);
}
