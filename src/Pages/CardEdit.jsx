import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCards } from '@/hooks/useCards';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/Components/ui/button';
import { Skeleton } from '@/Components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';
import CardEditor from '@/Components/card/CardEditor';
import { addDays } from 'date-fns';

export default function CardEdit() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  
  const cardId = searchParams.get('id');
  const folderId = searchParams.get('folderId');
  
  const [isLoading, setIsLoading] = useState(false);
  
  // useCardsフックから必要な関数とデータを取得
  const { cards: allCards = [], loading: cardsLoading, createCard, updateCard } = useCards();
  
  const card = allCards.find(c => c.id === cardId);
  
  const targetFolderId = folderId || card?.folderId;
  
  const { cards: folderCards = [] } = useCards(targetFolderId);
  
  const sortedCards = useMemo(() => {
    return [...folderCards].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [folderCards]);
  
  const questionNumber = cardId 
    ? sortedCards.findIndex(c => c.id === cardId) + 1
    : sortedCards.length + 1;

  const availableTags = useMemo(() => {
    const tags = new Set();
    allCards.forEach(c => {
      if (c.tags && Array.isArray(c.tags)) {
        c.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [allCards]);
  
  const handleSave = async (formData, continueCreating = false) => {
    setIsLoading(true);
    
    try {
      if (cardId && card) {
        await updateCard(cardId, {
          ...formData,
          updatedAt: new Date()
        });
        navigate(`/FolderView?id=${targetFolderId}`);
      } else {
        if (currentUser) {
          // folderIdが確実に設定されるようにする
          const finalFolderId = targetFolderId || formData.folderId || '';
          
          if (!finalFolderId) {
            alert('フォルダIDが指定されていません。フォルダから「カード追加」ボタンをクリックしてください。');
            setIsLoading(false);
            return;
          }
          
          const cardData = {
            ...formData,
            folderId: finalFolderId,
            isDraft: formData.isDraft ?? false,
          };
          
          await createCard(cardData);
          
          if (continueCreating) {
            // 続けて作成する場合はページをリロードせず、フォームをリセット
            window.location.reload();
          } else {
            navigate(`/FolderView?id=${targetFolderId}`);
          }
        }
      }
    } catch (error) {
      console.error('カード保存に失敗しました:', error);
      alert('カードの保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    if (targetFolderId) {
      navigate(`/FolderView?id=${targetFolderId}`);
    } else {
      navigate('/Folders');
    }
  };
  
  if (cardId && cardsLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7F8] text-slate-800 font-sans p-6 md:p-14">
        <div className="max-w-[1400px] mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#F5F7F8] text-slate-800 font-sans">
      <div className="max-w-[1400px] mx-auto p-2 md:pt-8 md:pb-10 md:px-14">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {cardId ? 'カード編集' : '新規カード作成'}
          </h1>
        </div>
        
        {/* Editor */}
        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
          <CardEditor
            card={card}
            folderId={targetFolderId}
            questionNumber={questionNumber}
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={isLoading}
            showContinueButton={!cardId}
            availableTags={availableTags}
          />
        </div>
      </div>
    </div>
  );
}
