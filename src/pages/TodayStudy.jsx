// 今日の学習ページ
// 今日復習すべきカードの一覧を表示し、学習を開始できる
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';
import { BookOpen, Play, ChevronRight, CheckCircle2, Clock } from '@/ui/icons';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------
// 日付変換ユーティリティ（Firestore タイムスタンプ対応）
// ---------------------------------------------------------
const toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object') {
    const seconds =
      typeof value.seconds === 'number'
        ? value.seconds
        : typeof value._seconds === 'number'
          ? value._seconds
          : null;
    const nanoseconds =
      typeof value.nanoseconds === 'number'
        ? value.nanoseconds
        : typeof value._nanoseconds === 'number'
          ? value._nanoseconds
          : 0;
    if (seconds !== null) {
      const d = new Date(seconds * 1000 + Math.floor(nanoseconds / 1e6));
      return isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// カードタイトルを安全に取得する
const getCardTitle = (card) => {
  const rawTitle = card?.title;
  if (typeof rawTitle === 'string' && rawTitle.trim().length > 0) {
    return rawTitle.trim();
  }
  const questionText = String(card?.questionText ?? card?.question_text ?? '');
  const textOnly = questionText.replace(/<[^>]*>/g, '').trim();
  if (textOnly.length > 0) {
    return textOnly.length > 60 ? `${textOnly.substring(0, 60)}...` : textOnly;
  }
  return '無題のカード';
};

export default function TodayStudy() {
  const navigate = useNavigate();
  const { cards = [], loading: cardsLoading } = useCards();
  const { folders = [], loading: foldersLoading } = useFolders();
  const { settings } = useUserSettings();

  // フォルダ ID → フォルダオブジェクトのマップ
  const folderMap = useMemo(() => {
    const map = new Map();
    folders.forEach((folder) => {
      const id = folder?.id ?? folder?.folderId;
      if (id) map.set(String(id), folder);
    });
    return map;
  }, [folders]);

  // 今日復習すべきカードを抽出
  const todayCards = useMemo(() => {
    if (!cards || cardsLoading || foldersLoading) return [];

    const autoCarryOver = settings?.autoCarryOver ?? true;
    const today = new Date();
    const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return cards.filter((card) => {
      // 削除済み・下書き・サイレントは除外
      const isDeleted = Boolean(card?.isDeleted ?? card?.is_deleted ?? card?.deleted ?? card?.deletedAt ?? card?.deleted_at);
      const isDraft = Boolean(card?.isDraft ?? card?.is_draft);
      const isSilent = Boolean(card?.isSilent ?? card?.is_silent);
      if (isDeleted || isDraft || isSilent) return false;

      const dateValue = card?.next_review_date ?? card?.nextReviewDate;
      const reviewDate = toDate(dateValue);
      if (!reviewDate) return false;

      // 孤立カード（存在しないフォルダ）を除外
      const folderId = card?.folderId ?? card?.folder_id;
      if (folderId !== null && folderId !== undefined && folderId !== '') {
        const normalizedFolderId = String(folderId);
        const folder = folderMap.get(normalizedFolderId);
        if (!folder) return false;
        if (Boolean(folder?.isDeleted ?? folder?.is_deleted)) return false;
      }

      const rDate = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
      if (autoCarryOver) {
        return rDate <= tDate;
      }
      return rDate.getTime() === tDate.getTime();
    });
  }, [cards, cardsLoading, folderMap, foldersLoading, settings?.autoCarryOver]);

  // フォルダ別にグループ化
  const groupedCards = useMemo(() => {
    const groups = {};
    todayCards.forEach((card) => {
      const fidRaw = card.folderId || card.folder_id;
      const fid = fidRaw ? String(fidRaw) : 'uncategorized';
      if (!groups[fid]) {
        groups[fid] = [];
      }
      groups[fid].push(card);
    });
    return Object.entries(groups).map(([folderId, groupCards]) => {
      if (folderId === 'uncategorized') {
        return { folderName: '未分類', cards: groupCards, folderId };
      }
      const folder = folderMap.get(folderId);
      return {
        folderName: folder?.folderName || folder?.folder_name || '不明なフォルダ',
        cards: groupCards,
        folderId,
      };
    }).sort((a, b) => b.cards.length - a.cards.length);
  }, [todayCards, folderMap]);

  const isLoading = cardsLoading || foldersLoading;
  const reviewCount = todayCards.length;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      
      {/* ヘッダーエリア */}
      <div className="bg-white border-b border-slate-100 px-5 pt-8 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center shadow-sm border border-primary-100/50">
              <BookOpen className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-primary-500 uppercase">Today's Learning</p>
              <h1 className="text-xl font-black text-slate-800 leading-tight">今日の学習</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-28">

        {/* サマリーカード */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-2xl border-none shadow-sm bg-white">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">今日の復習</span>
              </div>
              {isLoading ? (
                <div className="h-8 w-16 bg-slate-100 rounded animate-pulse" />
              ) : (
                <p className={cn(
                  "text-3xl font-black leading-none",
                  reviewCount > 0 ? "text-primary-600" : "text-slate-300"
                )}>
                  {reviewCount}
                  <span className="text-sm font-bold text-slate-400 ml-1">枚</span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-sm bg-white">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">フォルダ数</span>
              </div>
              {isLoading ? (
                <div className="h-8 w-16 bg-slate-100 rounded animate-pulse" />
              ) : (
                <p className="text-3xl font-black leading-none text-slate-700">
                  {groupedCards.length}
                  <span className="text-sm font-bold text-slate-400 ml-1">件</span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 学習開始ボタン */}
        <Button
          className={cn(
            "w-full h-14 rounded-2xl font-bold text-sm tracking-widest shadow-lg transition-all active:scale-[0.98]",
            reviewCount > 0
              ? "bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/25"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
          disabled={reviewCount === 0 || isLoading}
          onClick={() => navigate(createPageUrl('StudyMode'))}
        >
          <Play className="w-4 h-4 mr-2" />
          {reviewCount > 0 ? `${reviewCount}枚を学習スタート` : '今日の復習はありません'}
        </Button>

        {/* フォルダ別カード一覧 */}
        {!isLoading && reviewCount > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">フォルダ別</h2>
            {groupedCards.map((group) => (
              <Card
                key={group.folderId}
                className="rounded-2xl border-none shadow-sm bg-white overflow-hidden"
              >
                <CardContent className="p-0">
                  {/* フォルダヘッダー */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
                        <FolderIcon className="w-4 h-4 text-primary-500" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 truncate max-w-[180px]">
                        {group.folderName}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-primary-50 text-primary-600 border-none text-xs font-bold"
                    >
                      {group.cards.length}枚
                    </Badge>
                  </div>

                  {/* カードリスト（最大5件）*/}
                  <div className="divide-y divide-slate-50">
                    {group.cards.slice(0, 5).map((card) => (
                      <button
                        key={card.id}
                        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors group"
                        onClick={() => {
                          const cardFolderId = card.folderId || card.folder_id;
                          const query = cardFolderId
                            ? `CardEdit?id=${card.id}&folderId=${cardFolderId}&returnTo=today-study`
                            : `CardEdit?id=${card.id}&returnTo=today-study`;
                          navigate(createPageUrl(query));
                        }}
                      >
                        <span className="text-xs text-slate-600 truncate flex-1 group-hover:text-primary-600 transition-colors">
                          {getCardTitle(card)}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 ml-2 group-hover:text-primary-400 transition-colors" />
                      </button>
                    ))}
                    {/* 5件以上の場合は省略表示 */}
                    {group.cards.length > 5 && (
                      <div className="px-4 py-2 text-center">
                        <span className="text-[10px] font-bold text-slate-300">
                          + {group.cards.length - 5}枚
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ローディング状態 */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* 復習ゼロの場合 */}
        {!isLoading && reviewCount === 0 && (
          <Card className="rounded-2xl border-none shadow-sm bg-white">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-700 mb-2">今日の復習は完了！</h2>
              <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                今日分の復習カードはありません。新しいカードを追加するか、明日また確認してください。
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// インラインアイコンコンポーネント
// ---------------------------------------------------------
const FolderIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);
