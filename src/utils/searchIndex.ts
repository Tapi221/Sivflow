/**
 * Quick Open 検索インデックス
 * カード/フォルダ/タグを曖昧検索でスコアリングして返す
 */

import type { Card } from "@/types";
import type { Folder } from "@/types";

// タグの型定義（useTags.tsと同じ）
export interface Tag {
  id?: string;
  name: string;
  color: string;
  userId: string;
  updatedAt: Date;
  rootFolderId?: string;
}

// 検索結果の型定義
export type QuickOpenItemType = "card" | "folder" | "tag";

export interface QuickOpenItem {
  type: QuickOpenItemType;
  id: string;
  name: string; // 表示名
  path: string; // フォルダパスなど補助情報
  score: number; // スコア（高いほど優先）
  data: Card | Folder | Tag; // 元データ
  cardCount?: number; // タグの場合のカード数
}

export interface QuickOpenIndex {
  items: QuickOpenItem[];
  folderPathMap: Map<string, string>; // folderId -> パス
}

/**
 * フォルダIDからパスを構築
 */
function buildFolderPath(
  folderId: string | null | undefined,
  folders: Folder[],
  pathMap: Map<string, string>,
): string {
  if (!folderId) return "";
  if (pathMap.has(folderId)) return pathMap.get(folderId)!;

  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return "";

  const parentPath = buildFolderPath(folder.parentFolderId, folders, pathMap);
  const path = parentPath
    ? `${parentPath} / ${folder.folderName}`
    : folder.folderName;
  pathMap.set(folderId, path);
  return path;
}

/**
 * Quick Open 用インデックスを構築
 */
export function buildQuickOpenIndex(
  cards: Card[],
  folders: Folder[],
  tags: Tag[],
  cardTagCounts?: Map<string, number>,
): QuickOpenIndex {
  const folderPathMap = new Map<string, string>();

  // フォルダパスを事前構築
  folders.forEach((f) => buildFolderPath(f.id, folders, folderPathMap));

  const items: QuickOpenItem[] = [];

  // カードをインデックスに追加
  cards.forEach((card) => {
    const folderPath = buildFolderPath(card.folderId, folders, folderPathMap);
    items.push({
      type: "card",
      id: card.id,
      name: card.title || getCardPreviewText(card) || "無題のカード",
      path: folderPath,
      score: 0,
      data: card,
    });
  });

  // フォルダをインデックスに追加
  folders.forEach((folder) => {
    const path = folderPathMap.get(folder.id) || folder.folderName;
    items.push({
      type: "folder",
      id: folder.id,
      name: folder.folderName,
      path: path,
      score: 0,
      data: folder,
    });
  });

  // タグをインデックスに追加
  tags.forEach((tag) => {
    const count = cardTagCounts?.get(tag.name) ?? 0;
    items.push({
      type: "tag",
      id: tag.name,
      name: tag.name,
      path: `${count}件のカード`,
      score: 0,
      data: tag,
      cardCount: count,
    });
  });

  return { items, folderPathMap };
}

/**
 * カードのプレビューテキストを取得（タイトルがない場合）
 */
function getCardPreviewText(card: Card): string {
  // questionBlocks から最初のテキストを取得
  const blocks = card.questionBlocks || [];
  for (const block of blocks) {
    if (block.type === "text" && block.content) {
      return block.content.slice(0, 50);
    }
    if (block.type === "markdown" && block.markdown) {
      return block.markdown.slice(0, 50);
    }
  }
  // 古い形式のフォールバック
  if (card.questionText) {
    return card.questionText.slice(0, 50);
  }
  return "";
}

/**
 * スコアを計算（高いほど良い）
 */
function calculateScore(text: string, query: string, isName: boolean): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // 完全一致
  if (lowerText === lowerQuery) {
    return isName ? 150 : 120;
  }

  // 前方一致
  if (lowerText.startsWith(lowerQuery)) {
    return isName ? 100 : 80;
  }

  // 単語境界一致（スペースや記号の後）
  const wordBoundaryRegex = new RegExp(
    `(^|[\\s\\-_/])${escapeRegex(lowerQuery)}`,
    "i",
  );
  if (wordBoundaryRegex.test(lowerText)) {
    return isName ? 80 : 60;
  }

  // 部分一致
  if (lowerText.includes(lowerQuery)) {
    return isName ? 50 : 30;
  }

  return 0;
}

/**
 * 正規表現のエスケープ
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Quick Open 検索を実行
 */
export function searchQuickOpen(
  query: string,
  index: QuickOpenIndex,
  maxResults: number = 20,
): QuickOpenItem[] {
  if (!query.trim()) {
    // クエリが空の場合は最近のカードを表示（ここでは先頭から表示）
    return index.items.slice(0, maxResults);
  }

  // スペース区切りでAND検索
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  const results: QuickOpenItem[] = [];

  for (const item of index.items) {
    let totalScore = 0;
    let allTermsMatch = true;

    for (const term of terms) {
      // 名前に対するスコア
      const nameScore = calculateScore(item.name, term, true);
      // パスに対するスコア
      const pathScore = calculateScore(item.path, term, false);

      const termScore = Math.max(nameScore, pathScore);

      if (termScore === 0) {
        allTermsMatch = false;
        break;
      }

      totalScore += termScore;
    }

    if (allTermsMatch && totalScore > 0) {
      // 種別による基本優先度を加算（Card > Folder > Tag）
      const typePriority =
        item.type === "card" ? 10 : item.type === "folder" ? 5 : 0;

      results.push({
        ...item,
        score: totalScore + typePriority,
      });
    }
  }

  // スコア降順でソート
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, maxResults);
}



