import React, { useMemo } from 'react';
import { Button } from '@/Components/ui/button';
import { extractTextFromBlocks } from '@/utils';
import { formatLastAccess } from '@/utils/dateUtils';
import type { Card } from '@/types';

type FolderStats = {
  dueCount: number;
  unlearnedCount: number;
  lastReviewedAt?: Date | string | null;
};

type FolderDashboardHandlers = {
  onStartStudy: () => void;
  onCreateCard: () => void;
  onBulkCreate: () => void;
};

interface FolderDashboardProps {
  folderId: string;
  folderName: string;
  cards: Card[];
  stats: FolderStats;
  handlers: FolderDashboardHandlers;
}

const toDate = (value: any): Date | null => {
  if (value === null || value === undefined) return null;
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const getPreviewText = (card: Card): string => {
  const q = extractTextFromBlocks(card.questionBlocks ?? []);
  if (q) return q;
  const a = extractTextFromBlocks(card.answerBlocks ?? []);
  if (a) return a;
  if (card.questionText) return card.questionText;
  if (card.answerText) return card.answerText;
  return '';
};

const displayTitle = (card: Card): string => {
  const title = card.title?.trim();
  if (title) return title;
  const preview = getPreviewText(card).replace(/\s+/g, ' ').trim();
  if (preview) return preview.slice(0, 40);
  return '無題のカード';
};

const formatShortDate = (value: Date | null): string => {
  if (!value) return '-';
  return value.toLocaleDateString('ja-JP');
};

export function FolderDashboard({
  folderId,
  folderName,
  cards,
  stats,
  handlers,
}: FolderDashboardProps) {
  const lastReviewedText = useMemo(() => {
    const d = toDate(stats.lastReviewedAt);
    if (!d) return '未学習';
    const formatted = formatLastAccess(d);
    return formatted?.text || d.toLocaleDateString('ja-JP');
  }, [stats.lastReviewedAt]);

  const recentCards = useMemo(() => {
    if (!cards || cards.length === 0) return [];
    return [...cards]
      .filter((c) => !(c.isDeleted ?? (c as any).is_deleted))
      .sort((a, b) => {
        const aTime =
          toDate(a.updatedAt ?? (a as any).updated_at ?? a.createdAt ?? (a as any).created_at)?.getTime() || 0;
        const bTime =
          toDate(b.updatedAt ?? (b as any).updated_at ?? b.createdAt ?? (b as any).created_at)?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 3);
  }, [cards]);

  const overdueCards = useMemo(() => {
    if (!cards || cards.length === 0) return [];
    const today = new Date();
    const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return [...cards]
      .filter((c) => {
        const isDraft = c.isDraft ?? (c as any).is_draft;
        if (isDraft) return false;
        const reviewDate = toDate(c.nextReviewDate ?? (c as any).next_review_date);
        if (!reviewDate) return false;
        const rDate = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
        return rDate <= tDate;
      })
      .sort((a, b) => {
        const aTime = toDate(a.nextReviewDate ?? (a as any).next_review_date)?.getTime() || 0;
        const bTime = toDate(b.nextReviewDate ?? (b as any).next_review_date)?.getTime() || 0;
        return aTime - bTime;
      })
      .slice(0, 3);
  }, [cards]);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <p className="text-xs text-slate-400 font-semibold">フォルダダッシュボード</p>
        <h2 className="text-xl font-bold text-slate-800 mt-1">{folderName || folderId}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div className="text-[11px] text-slate-500">カード数</div>
          <div className="text-lg font-bold text-slate-700">{cards.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div className="text-[11px] text-slate-500">今日やる数</div>
          <div className="text-lg font-bold text-slate-700">{stats.dueCount ?? 0}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div className="text-[11px] text-slate-500">未学習数</div>
          <div className="text-lg font-bold text-slate-700">{stats.unlearnedCount ?? 0}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div className="text-[11px] text-slate-500">最終学習日</div>
          <div className="text-sm font-bold text-slate-700">{lastReviewedText}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handlers.onStartStudy}>学習開始</Button>
        <Button variant="outline" onClick={handlers.onCreateCard}>
          新規カード
        </Button>
        <Button variant="outline" onClick={handlers.onBulkCreate}>
          一括作成
        </Button>
      </div>

      {recentCards.length > 0 && (
        <div>
          <div className="text-xs font-bold text-slate-500 mb-2">最近編集したカード</div>
          <div className="space-y-2">
            {recentCards.map((card) => {
              const updatedAt = toDate(card.updatedAt ?? (card as any).updated_at);
              return (
                <div key={card.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-700 truncate min-w-0">{displayTitle(card)}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{formatShortDate(updatedAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {overdueCards.length > 0 && (
        <div>
          <div className="text-xs font-bold text-slate-500 mb-2">期限切れカード</div>
          <div className="space-y-2">
            {overdueCards.map((card) => {
              const dueAt = toDate(card.nextReviewDate ?? (card as any).next_review_date);
              return (
                <div key={card.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-700 truncate min-w-0">{displayTitle(card)}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{formatShortDate(dueAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
