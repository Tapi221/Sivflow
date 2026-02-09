import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocalDb } from '../services/localDB';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Skeleton } from '@/Components/ui/skeleton';
import { 
  ArrowLeft, 
  HelpCircle, 
  Check, 
  Folder,
  ChevronRight
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { getStabilityPhase, normalizeMemoryStability } from '@/utils/reviewUtils';

import CardList from '@/Components/card/CardList';

export default function UncertainMode() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: cards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
       const all = await localDb.getAllCards();
       return all.filter(c => !c.isDeleted && (c.hasUncertainty || c.has_uncertainty));
    },
  });
  
  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
       const all = await localDb.getAllFolders();
       return all.filter(f => !f.isDeleted);
    },
  });
  
  const updateCardMutation = useMutation({
    mutationFn: ({ id, data }) => localDb.updateItem('cards', id, data),
    onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['cards'] });
         // Also invalidate folder query if needed, though card update affects cards
    },
  });
  
  // Group cards by folder
  const cardsByFolder = useMemo(() => {
    const grouped = {};
    cards.forEach(card => {
      // Handle cards with no folderId just in case
      const fid = card.folder_id || card.folderId || 'unknown';
      if (!grouped[fid]) {
        grouped[fid] = [];
      }
      grouped[fid].push(card);
    });
    return grouped;
  }, [cards]);
  
  const handleRemoveUncertainty = async (card) => {
    await updateCardMutation.mutateAsync({
      id: card.id,
      data: { has_uncertainty: false } // camelCase for localDB might be needed? base44 uses snake_case usually but normalized? 
      // Checking existing code: it used has_uncertainty: false.
    });
  };

  const handleToggleBookmark = async (card) => {
    const current = card.isBookmarked ?? card.is_bookmarked ?? false;
    await updateCardMutation.mutateAsync({
      id: card.id,
      data: { is_bookmarked: !current }
    });
  };
  
  const handleDelete = async (card) => {
     if (window.confirm('このカードをごみ箱に移動しますか？')) {
        await updateCardMutation.mutateAsync({
            id: card.id,
            data: { is_deleted: true, deleted_at: new Date() }
        });
     }
  };
  
  const handleViewCard = (card) => {
    // If viewing, maybe use CardView page or just Edit?
    // Existing code used CardEdit. Folder screen uses CardView for view and CardEdit for edit.
    // I'll stick to CardEdit for consistency with previous implementation or Switch to CardView?
    // "Folder screen" uses `onView` -> navigate CardView. `onEdit` -> navigate CardEdit.
    navigate(createPageUrl(`CardView?folderId=${card.folder_id || card.folderId}&cardId=${card.id}`));
  };

  const handleEditCard = (card) => {
    navigate(createPageUrl(`CardEdit?id=${card.id}&folderId=${card.folder_id || card.folderId}`));
  };
  
  const getFolderPath = (folderId) => {
    if (folderId === 'unknown') return 'フォルダなし';
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return '(不明なフォルダ)';
    
    const path = [];
    let current = folder;
    const seen = new Set();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      path.unshift(current.folderName || current.folder_name);
      current = folders.find(f => f.id === (current.parentFolderId || current.parent_folder_id));
    }
    return path.join(' / ');
  };
  
  const isLoading = cardsLoading || foldersLoading;
  
  return (
    <div className="min-h-screen bg-[#F8FAFB] text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto p-6 md:p-14">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="mt-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors w-9 h-9"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
                <HelpCircle className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-2xl font-extrabold text-[#334155] tracking-tight">はてなモード</h1>
                <p className="text-sm text-slate-400 font-bold tracking-tight">「？」マークが付いたカードを重点的に復習します</p>
             </div>
          </div>
          <Badge className="ml-auto bg-primary-50 text-primary-700 border-primary-100 text-sm px-3 py-1">
            {cards.length} 件
          </Badge>
        </div>
        
        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-40 w-full rounded-[24px]" />)}
          </div>
        ) : cards.length === 0 ? (
          <Card className="rounded-[32px] border-none shadow-sm bg-white overflow-hidden p-8 text-center py-20">
             <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
               <Check className="w-10 h-10 text-primary-600" />
             </div>
             <h2 className="text-2xl font-bold text-slate-700 mb-2">すべて確認済み！</h2>
             <p className="text-slate-400 font-bold mb-8">
               「？」マークが付いたカードはありません
             </p>
             <Button 
                onClick={() => navigate(createPageUrl('Dashboard'))}
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 h-12 rounded-full font-bold shadow-md hover:shadow-lg transition-all"
            >
               ダッシュボードに戻る
             </Button>
          </Card>
        ) : (
          <div className="space-y-12">
            {Object.entries(cardsByFolder).map(([folderId, folderCards]) => (
              <div key={folderId}>
                <div className="flex items-center gap-2 mb-4 ml-2">
                   <Folder className="w-5 h-5 text-primary-600 fill-primary-600/10" />
                   <h2 className="text-lg font-bold text-slate-700">
                     {getFolderPath(folderId)}
                   </h2>
                   <Badge variant="secondary" className="bg-slate-100 text-slate-500">
                     {folderCards.length}
                   </Badge>
                </div>
                
                <CardList 
                    cards={folderCards}
                    onView={handleViewCard}
                    onEdit={handleEditCard}
                    onDelete={handleDelete}
                    onToggleUncertainty={handleRemoveUncertainty}
                    onToggleBookmark={handleToggleBookmark}
                    onReorder={() => {}} // No-op for reorder in this view
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}