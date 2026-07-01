/**
 * vault.spec.ts
 *
 * local-vault 機能のユニットテスト。
 * - generateSlug: タイトルからファイル名を生成する関数
 * - initVault: フォルダ構造の初期化
 * - writeMarkdownPage: Markdown 書き出しと pages.json 更新
 * - isValidVaultPath: vault の有効性検証
 * - getVaultMeta: vault.json と pages.json の読み込み
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// mainRPC をモックする（Electron の IPC に依存しないように）
vi.doMock('@affine/electron/helper/main-rpc', () => ({
  mainRPC: {
    getPath: async () => os.tmpdir(),
    showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
  },
}));

const {
  generateSlug,
  getVaultMeta,
  initVault,
  isValidVaultPath,
  writeMarkdownPage,
} = await import('@affine/electron/helper/vault/vault');

// ────────────────────────────────────────────────────────────
// テスト用ディレクトリの準備・後片付け
// ────────────────────────────────────────────────────────────

const tmpBase = path.join(os.tmpdir(), `sivflow-vault-test-${randomUUID()}`);
let vaultPath: string;

beforeEach(async () => {
  vaultPath = path.join(tmpBase, `vault-${randomUUID()}`);
  await fs.mkdir(vaultPath, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpBase, { recursive: true, force: true }).catch(() => {});
});

// ────────────────────────────────────────────────────────────
// generateSlug のテスト
// ────────────────────────────────────────────────────────────

describe('generateSlug', () => {
  test('通常のタイトルを kebab-case に変換する', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  test('日本語タイトルは変換後に有効な slug を返す（Windows 禁止文字なし）', () => {
    const result = generateSlug('プロジェクト計画');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).not.toMatch(/[<>:"/\\|?*]/);
  });

  test('コロンとスラッシュを除去する', () => {
    const slug = generateSlug('my:file/name');
    expect(slug).not.toMatch(/[:/]/);
  });

  test('山括弧を除去する', () => {
    const slug = generateSlug('test<>doc');
    expect(slug).not.toMatch(/[<>]/);
  });

  test('空文字列は "untitled" を返す', () => {
    expect(generateSlug('')).toBe('untitled');
  });

  test('空白のみの文字列は "untitled" を返す', () => {
    expect(generateSlug('   ')).toBe('untitled');
  });

  test('Windows 予約名 CON に page- prefix を付与する', () => {
    expect(generateSlug('CON')).toBe('page-con');
  });

  test('Windows 予約名 NUL に page- prefix を付与する', () => {
    expect(generateSlug('NUL')).toBe('page-nul');
  });

  test('Windows 予約名 COM1 に page- prefix を付与する', () => {
    expect(generateSlug('COM1')).toBe('page-com1');
  });

  test('複数スペースを単一ハイフンに変換する', () => {
    expect(generateSlug('hello   world')).toBe('hello-world');
  });

  test('先頭・末尾のハイフンを削除する', () => {
    const result = generateSlug('  hello  ');
    expect(result).not.toMatch(/^-|-$/);
    expect(result).toBe('hello');
  });

  test('大文字を小文字に変換する', () => {
    expect(generateSlug('MyDocument')).toBe('mydocument');
  });
});

// ────────────────────────────────────────────────────────────
// initVault のテスト
// ────────────────────────────────────────────────────────────

describe('initVault', () => {
  test('正常: ディレクトリ構造と vault.json を作成する', async () => {
    const workspaceId = 'test-workspace-id';
    const workspaceName = 'Test Vault';

    const result = await initVault(vaultPath, workspaceId, workspaceName);

    expect(result.success).toBe(true);

    // すべてのサブディレクトリが作成されていること
    for (const dir of ['pages', 'assets', '.sivflow', path.join('.sivflow', 'ydocs')]) {
      const stat = await fs.stat(path.join(vaultPath, dir));
      expect(stat.isDirectory()).toBe(true);
    }

    // vault.json が正しい内容で作成されていること
    const vaultJsonPath = path.join(vaultPath, '.sivflow', 'vault.json');
    const vaultJson = JSON.parse(await fs.readFile(vaultJsonPath, 'utf-8'));
    expect(vaultJson.version).toBe(1);
    expect(vaultJson.workspaceId).toBe(workspaceId);
    expect(vaultJson.name).toBe(workspaceName);
    expect(typeof vaultJson.createdAt).toBe('string');

    // pages.json が空配列で作成されていること
    const pagesJsonPath = path.join(vaultPath, '.sivflow', 'pages.json');
    const pagesJson = JSON.parse(await fs.readFile(pagesJsonPath, 'utf-8'));
    expect(Array.isArray(pagesJson)).toBe(true);
    expect(pagesJson).toHaveLength(0);
  });

  test('存在しないパスを指定するとエラーを返す', async () => {
    const result = await initVault(
      path.join(vaultPath, 'nonexistent'),
      'id',
      'name'
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('二回目の initVault は既存の vault.json を上書きしない', async () => {
    await initVault(vaultPath, 'original-id', 'Original');

    const vaultJsonPath = path.join(vaultPath, '.sivflow', 'vault.json');
    const before = JSON.parse(await fs.readFile(vaultJsonPath, 'utf-8'));

    // 異なる ID/名前で再度 initVault を呼ぶ
    await initVault(vaultPath, 'new-id', 'New Name');
    const after = JSON.parse(await fs.readFile(vaultJsonPath, 'utf-8'));

    expect(after.workspaceId).toBe(before.workspaceId);
    expect(after.name).toBe(before.name);
  });
});

// ────────────────────────────────────────────────────────────
// writeMarkdownPage のテスト
// ────────────────────────────────────────────────────────────

describe('writeMarkdownPage', () => {
  beforeEach(async () => {
    await initVault(vaultPath, 'ws-id', 'Test Vault');
  });

  test('正常: Markdown ファイルと pages.json を作成する', async () => {
    const result = await writeMarkdownPage(
      vaultPath,
      'doc-001',
      'My First Page',
      '# My First Page\n\nHello!'
    );

    expect(result.success).toBe(true);
    expect(result.filePath).toBeTruthy();

    // Markdown ファイルの内容を確認
    const content = await fs.readFile(result.filePath!, 'utf-8');
    expect(content).toContain('Hello!');

    // pages.json にエントリが追加されていること
    const pagesJsonPath = path.join(vaultPath, '.sivflow', 'pages.json');
    const pages = JSON.parse(await fs.readFile(pagesJsonPath, 'utf-8'));
    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe('doc-001');
    expect(pages[0].title).toBe('My First Page');
    expect(pages[0].slug).toBe('my-first-page');
    expect(pages[0].updatedAt).toBeTruthy();
  });

  test('slug からファイルパスが正しく生成される', async () => {
    const result = await writeMarkdownPage(
      vaultPath,
      'doc-abc',
      'Hello World',
      '# Hello'
    );

    expect(result.filePath).toContain('hello-world.md');
  });

  test('同じ docId で再度書き出すと内容を上書きし pages.json のエントリ数が増えない', async () => {
    await writeMarkdownPage(vaultPath, 'doc-001', 'Old Title', '# Old\n\nOld content');
    const r2 = await writeMarkdownPage(vaultPath, 'doc-001', 'New Title', '# New\n\nNew content');

    expect(r2.success).toBe(true);

    const pagesJsonPath = path.join(vaultPath, '.sivflow', 'pages.json');
    const pages = JSON.parse(await fs.readFile(pagesJsonPath, 'utf-8'));

    // エントリが増えていないこと
    expect(pages).toHaveLength(1);
    expect(pages[0].title).toBe('New Title');

    // ファイル内容が更新されていること
    const content = await fs.readFile(r2.filePath!, 'utf-8');
    expect(content).toContain('New content');
  });

  test('slug が衝突する場合は docId suffix を付与して別ファイルを作成する', async () => {
    const r1 = await writeMarkdownPage(
      vaultPath,
      'doc-aaa111',
      'Same Title',
      '# Page 1'
    );
    const r2 = await writeMarkdownPage(
      vaultPath,
      'doc-bbb222',
      'Same Title',
      '# Page 2'
    );

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    // 異なるファイルパスであること
    expect(r1.filePath).not.toBe(r2.filePath);
  });

  test('存在しない vault パスはエラーを返す', async () => {
    const result = await writeMarkdownPage(
      path.join(vaultPath, 'nonexistent'),
      'doc-001',
      'Title',
      '# Content'
    );
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// isValidVaultPath のテスト
// ────────────────────────────────────────────────────────────

describe('isValidVaultPath', () => {
  test('vault.json が存在する場合は true を返す', async () => {
    await initVault(vaultPath, 'ws-id', 'Test');
    expect(await isValidVaultPath(vaultPath)).toBe(true);
  });

  test('初期化前（vault.json が存在しない）は false を返す', async () => {
    expect(await isValidVaultPath(vaultPath)).toBe(false);
  });

  test('存在しないパスは false を返す', async () => {
    expect(
      await isValidVaultPath(path.join(vaultPath, 'nonexistent'))
    ).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// getVaultMeta のテスト
// ────────────────────────────────────────────────────────────

describe('getVaultMeta', () => {
  test('vault.json と pages.json を読み込んで返す', async () => {
    await initVault(vaultPath, 'ws-id', 'My Vault');
    await writeMarkdownPage(vaultPath, 'doc-1', 'Page One', '# Page One');

    const meta = await getVaultMeta(vaultPath);

    expect(meta.vault?.workspaceId).toBe('ws-id');
    expect(meta.vault?.name).toBe('My Vault');
    expect(meta.vault?.version).toBe(1);
    expect(Array.isArray(meta.pageIndex)).toBe(true);
    expect(meta.pageIndex).toHaveLength(1);
    expect(meta.pageIndex?.[0].title).toBe('Page One');
  });

  test('初期化されていない vault は vault と pageIndex が undefined', async () => {
    const meta = await getVaultMeta(vaultPath);
    expect(meta.vault).toBeUndefined();
    expect(meta.pageIndex).toBeUndefined();
    expect(meta.error).toBeUndefined();
  });
});
