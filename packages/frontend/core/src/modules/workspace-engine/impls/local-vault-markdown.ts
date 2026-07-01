/**
 * local-vault-markdown.ts
 *
 * local-vault 用 Markdown export ユーティリティ。
 *
 * 現在の実装:
 * - BlockSuite の Markdown transformer を使って Doc → Markdown を変換する
 * - 変換後のテキストを Vault の pages/{slug}.md に書き出す（一方向 export）
 *
 * 将来の拡張:
 * - 外部ファイル編集の監視・取り込み（双方向同期）
 * - Yjs update の .sivflow/ydocs/ への保存
 */

import { DebugLogger } from '@affine/debug';
import type { Doc } from '@blocksuite/affine/store';

const logger = new DebugLogger('local-vault-markdown');

// ────────────────────────────────────────────────────────────
// Markdown 変換
// ────────────────────────────────────────────────────────────

/**
 * BlockSuite の Doc を Markdown テキストに変換する。
 *
 * BlockSuite が MdAdapter を提供しているため、それを使用する。
 * 変換に失敗した場合はシンプルなフォールバックテキストを返す。
 */
export async function docToMarkdown(doc: Doc): Promise<string> {
  try {
    // BlockSuite の MdAdapter を動的インポートして使用
    const { MdAdapter } = await import(
      '@blocksuite/affine/blocks/paragraph'
    ).catch(() => ({ MdAdapter: null }));

    if (MdAdapter) {
      const adapter = new MdAdapter(null as any);
      const snapshot = doc.spaceDoc;
      if (snapshot) {
        const result = await adapter.fromDoc(doc);
        if (result?.file) {
          return result.file;
        }
      }
    }
  } catch (e) {
    logger.warn('docToMarkdown: MdAdapter failed, falling back', e);
  }

  // フォールバック: シンプルなメタデータのみ出力
  return fallbackMarkdown(doc);
}

/**
 * Markdown 変換に失敗した場合のフォールバック。
 * ページタイトルと作成日時のみを含む最小限の Markdown を返す。
 */
function fallbackMarkdown(doc: Doc): string {
  const title = doc.meta?.title ?? 'Untitled';
  const createdAt = doc.meta?.createDate
    ? new Date(doc.meta.createDate).toISOString()
    : new Date().toISOString();

  const lines: string[] = [
    `# ${title}`,
    '',
    `> Created: ${createdAt}`,
    `> Doc ID: ${doc.id}`,
    '',
    '*Content export not available in this version.*',
    '',
  ];

  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────
// Vault への書き出し
// ────────────────────────────────────────────────────────────

/**
 * Doc を Markdown に変換して Vault の pages/ ディレクトリに書き出す。
 *
 * Electron 環境でのみ動作する（handler.vault.writeMarkdownPage を使用）。
 */
export async function exportDocToVault(
  doc: Doc,
  vaultPath: string,
  electronApiHandler: any
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  if (!vaultPath) {
    return { success: false, error: 'vaultPath is not set' };
  }

  const title = doc.meta?.title || 'Untitled';
  const docId = doc.id;

  let markdownContent: string;
  try {
    markdownContent = await docToMarkdown(doc);
  } catch (e) {
    logger.error('exportDocToVault: docToMarkdown failed', e);
    markdownContent = fallbackMarkdown(doc);
  }

  try {
    const result = await electronApiHandler.vault.writeMarkdownPage(
      vaultPath,
      docId,
      title,
      markdownContent
    );
    return result;
  } catch (e) {
    logger.error('exportDocToVault: writeMarkdownPage IPC failed', e);
    return { success: false, error: (e as Error).message };
  }
}
