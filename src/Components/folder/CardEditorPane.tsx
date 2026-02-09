import React from 'react';
import { FileText } from 'lucide-react';
import CardEditor from '@/Components/card/CardEditor';
import { useCards } from '@/hooks/useCards';

interface CardEditorPaneProps {
  selectedCardId: string | null;
  onCardUpdated?: () => void;
}

export function CardEditorPane({ selectedCardId, onCardUpdated }: CardEditorPaneProps) {
  const { cards, updateCard } = useCards();
  
  // 選択されたカードを取得
  const selectedCard = selectedCardId 
    ? cards.find(c => c.id === selectedCardId)
    : null;

  // カード未選択時のプレースホルダ
  if (!selectedCardId || !selectedCard) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-slate-400">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-bold">左のツリーからカードを選択してください</p>
          <p className="text-xs mt-2 opacity-70">カードをクリックすると編集できます</p>
        </div>
      </div>
    );
  }

  // カード保存ハンドラー
  const handleSave = async (data: any) => {
    try {
      await updateCard(selectedCardId, data);
      if (onCardUpdated) {
        onCardUpdated();
      }
    } catch (error) {
      console.error('カードの保存に失敗しました:', error);
      throw error;
    }
  };

  return (
    <div className="h-full overflow-y-auto outline-none">
      <CardEditor
        card={selectedCard}
        folderId={selectedCard.folderId}
        onSave={handleSave}
        onCancel={() => {
          // 作業モードではキャンセルボタンを非表示にするため、このハンドラーは呼ばれない
        }}
        isLoading={false}
        showCancelButton={false}
        showContinueButton={false}
        showSaveButton={false}
        hideTitle={false}
      />
    </div>
  );
}
