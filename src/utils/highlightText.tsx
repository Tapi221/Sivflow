/**
 * 検索結果のハイライト表示ユーティリティ
 */

import React from "react";

/**
 * テキスト内のクエリにマッチする部分をハイライト表示
 */
export function highlightMatches(
  text: string,
  query: string,
  highlightClassName: string = "bg-yellow-200 text-yellow-900 rounded px-0.5",
): React.ReactNode {
  if (!query.trim()) {
    return text;
  }

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  // 全てのマッチ位置を収集
  const matches: { start: number; end: number }[] = [];
  const lowerText = text.toLowerCase();

  for (const term of terms) {
    let startIndex = 0;
    while (true) {
      const index = lowerText.indexOf(term, startIndex);
      if (index === -1) break;
      matches.push({ start: index, end: index + term.length });
      startIndex = index + 1;
    }
  }

  if (matches.length === 0) {
    return text;
  }

  // マッチをソートしてマージ
  matches.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];

  for (const match of matches) {
    if (merged.length === 0) {
      merged.push(match);
    } else {
      const last = merged[merged.length - 1];
      if (match.start <= last.end) {
        last.end = Math.max(last.end, match.end);
      } else {
        merged.push(match);
      }
    }
  }

  // ハイライト付きのReact要素を構築
  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  for (let i = 0; i < merged.length; i++) {
    const { start, end } = merged[i];

    // マッチ前のテキスト
    if (start > lastIndex) {
      result.push(text.slice(lastIndex, start));
    }

    // ハイライト部分
    result.push(
      <mark key={i} className={highlightClassName}>
        {text.slice(start, end)}
      </mark>,
    );

    lastIndex = end;
  }

  // 残りのテキスト
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return <>{result}</>;
}




