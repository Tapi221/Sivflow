/**
 * 全文検索インデックス
 * カード本文（問題/解答/コード/数式）をテキスト化して検索
 */

import type { Card } from '../types';
import type { Folder } from '../types';
import type { Tag, QuickOpenItemType } from './searchIndex';

// 検索フィールドの種類
export type MatchField = 'title' | 'question' | 'answer' | 'code' | 'math' | 'name' | 'path';

// 全文検索結果
export interface FullTextResult {
  type: QuickOpenItemType;
  id: string;
  name: string;
  path: string;
  matchField: MatchField;
  snippet: string;         // ヒット箇所のスニペット
  matchPositions: number[]; // マッチ位置（ハイライト用）
  score: number;
  data: Card | Folder | Tag;
}

// 検索フィルタ
export interface SearchFilters {
  types?: QuickOpenItemType[];  // 検索対象の種別
  tagFilter?: string;           // 特定タグを持つカードのみ
}

// インデックスアイテム
interface FullTextItem {
  type: QuickOpenItemType;
  id: string;
  name: string;
  path: string;
  searchableTexts: { field: MatchField; text: string }[];
  data: Card | Folder | Tag;
  tags?: string[];
}

export interface FullTextIndex {
  items: FullTextItem[];
}

/**
 * ブロックからテキストを抽出
 */
function extractBlockTexts(blocks: any[]): { field: MatchField; text: string }[] {
  const results: { field: MatchField; text: string }[] = [];
  
  for (const block of blocks || []) {
    switch (block.type) {
      case 'text':
      case 'memo':
        if (block.content?.trim()) {
          results.push({ field: 'question', text: block.content });
        }
        break;
      case 'code':
        if (block.code?.code?.trim()) {
          results.push({ field: 'code', text: block.code.code });
        }
        break;
      case 'math':
        if (block.math?.latex?.trim()) {
          results.push({ field: 'math', text: block.math.latex });
        }
        break;
    }
  }
  
  return results;
}

/**
 * 全文検索用インデックスを構築
 */
export function buildFullTextIndex(
  cards: Card[],
  folders: Folder[],
  tags: Tag[],
  folderPathMap: Map<string, string>
): FullTextIndex {
  const items: FullTextItem[] = [];
  
  // カード
  for (const card of cards) {
    const searchableTexts: { field: MatchField; text: string }[] = [];
    
    // タイトル
    if (card.title?.trim()) {
      searchableTexts.push({ field: 'title', text: card.title });
    }
    
    // 問題ブロック
    const questionTexts = extractBlockTexts(card.questionBlocks || []);
    for (const qt of questionTexts) {
      searchableTexts.push({ ...qt, field: 'question' });
    }
    
    // 解答ブロック
    const answerTexts = extractBlockTexts(card.answerBlocks || []);
    for (const at of answerTexts) {
      searchableTexts.push({ ...at, field: 'answer' });
    }
    
    // 旧形式のテキスト
    if (card.questionText?.trim()) {
      searchableTexts.push({ field: 'question', text: card.questionText });
    }
    if (card.answerText?.trim()) {
      searchableTexts.push({ field: 'answer', text: card.answerText });
    }
    
    const path = folderPathMap.get(card.folderId || '') || '';
    
    items.push({
      type: 'card',
      id: card.id,
      name: card.title || '無題のカード',
      path,
      searchableTexts,
      data: card,
      tags: card.tags,
    });
  }
  
  // フォルダ
  for (const folder of folders) {
    const path = folderPathMap.get(folder.id) || folder.folderName;
    items.push({
      type: 'folder',
      id: folder.id,
      name: folder.folderName,
      path,
      searchableTexts: [
        { field: 'name', text: folder.folderName },
        { field: 'path', text: path },
      ],
      data: folder,
    });
  }
  
  // タグ
  for (const tag of tags) {
    items.push({
      type: 'tag',
      id: tag.name,
      name: tag.name,
      path: '',
      searchableTexts: [{ field: 'name', text: tag.name }],
      data: tag,
    });
  }
  
  return { items };
}

/**
 * スニペットを生成（前後の文字を含む）
 */
function generateSnippet(
  text: string,
  query: string,
  contextLength: number = 40
): { snippet: string; positions: number[] } {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) {
    return { snippet: text.slice(0, contextLength * 2) + '...', positions: [] };
  }
  
  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + query.length + contextLength);
  
  let snippet = '';
  if (start > 0) snippet += '...';
  snippet += text.slice(start, end);
  if (end < text.length) snippet += '...';
  
  // スニペット内でのマッチ位置を計算
  const adjustedIndex = index - start + (start > 0 ? 3 : 0);
  
  return {
    snippet,
    positions: [adjustedIndex],
  };
}

/**
 * 全文検索を実行
 */
export function searchFullText(
  query: string,
  index: FullTextIndex,
  filters: SearchFilters = {},
  maxResults: number = 50
): FullTextResult[] {
  if (!query.trim()) {
    return [];
  }
  
  const lowerQuery = query.toLowerCase();
  const terms = lowerQuery.split(/\s+/).filter(t => t.length > 0);
  
  const results: FullTextResult[] = [];
  
  for (const item of index.items) {
    // 種別フィルタ
    if (filters.types && filters.types.length > 0) {
      if (!filters.types.includes(item.type)) {
        continue;
      }
    }
    
    // タグフィルタ（カードのみ）
    if (filters.tagFilter && item.type === 'card') {
      if (!item.tags?.includes(filters.tagFilter)) {
        continue;
      }
    }
    
    // 各検索可能テキストで検索
    for (const { field, text } of item.searchableTexts) {
      const lowerText = text.toLowerCase();
      
      // 全てのタームが含まれているかチェック
      let allTermsMatch = true;
      let score = 0;
      
      for (const term of terms) {
        if (lowerText.includes(term)) {
          // 前方一致なら高スコア
          if (lowerText.startsWith(term)) {
            score += 100;
          } else {
            score += 50;
          }
        } else {
          allTermsMatch = false;
          break;
        }
      }
      
      if (allTermsMatch) {
        const { snippet, positions } = generateSnippet(text, query);
        
        results.push({
          type: item.type,
          id: item.id,
          name: item.name,
          path: item.path,
          matchField: field,
          snippet,
          matchPositions: positions,
          score,
          data: item.data,
        });
        
        // 同じアイテムで複数フィールドがヒットしても1つだけ返す
        break;
      }
    }
  }
  
  // スコア降順でソート
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, maxResults);
}
