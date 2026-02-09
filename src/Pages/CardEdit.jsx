import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCards } from '@/hooks/useCards';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/Components/ui/button';
import { Skeleton } from '@/Components/ui/skeleton';
import { ArrowLeft, GripVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { createPageUrl } from '@/utils';
import CardEditor from '@/Components/card/CardEditor';
import { addDays } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function CardEdit() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  
  const cardId = searchParams.get('id');
  const folderId = searchParams.get('folderId');
  const mode = searchParams.get('mode') || 'default';
  const hideTitle = searchParams.get('hideTitle') === 'true';
  
  const [isLoading, setIsLoading] = useState(false);
  const [savingIds, setSavingIds] = useState(new Set());
  
  // useCardsフックから必要な関数とデータを取得
  const { cards: allCards = [], loading: cardsLoading, createCard, updateCard, deleteCard } = useCards();
  
  const card = allCards.find(c => c.id === cardId);
  
  const targetFolderId = folderId || card?.folderId;
  
  const { cards: folderCards = [] } = useCards(targetFolderId);
  
  const sortedCards = useMemo(() => {
    return [...folderCards].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [folderCards]);
  
  const [editors, setEditors] = useState(() => {
    if (cardId) {
      return [{ id: cardId, isSaved: false, autoFocus: true }];
    }
    return [
      { id: nanoid(), isSaved: false, autoFocus: true },
      { id: nanoid(), isSaved: false, autoFocus: false }
    ];
  });

  const questionNumberOffset = useMemo(() => {
    if (cardId) {
      return sortedCards.findIndex(c => c.id === cardId);
    }
    return sortedCards.length;
  }, [sortedCards, cardId]);

  const availableTags = useMemo(() => {
    const tags = new Set();
    allCards.forEach(c => {
      if (c.tags && Array.isArray(c.tags)) {
        c.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [allCards]);
  
  const handleSave = async (editorId, formData, continueCreating = false) => {
    if (savingIds.has(editorId)) return;
    setSavingIds(prev => new Set(prev).add(editorId));
    
    try {
      if (cardId && card) {
        await updateCard(cardId, {
          ...formData,
          updatedAt: new Date()
        });
        toast.success('カードを更新しました');
        navigate(`/FolderView?id=${targetFolderId}`);
      } else {
        if (currentUser) {
          const finalFolderId = targetFolderId || formData.folderId || '';
          
          if (!finalFolderId) {
            toast.error('フォルダIDが指定されていません。');
            return;
          }
          
          const cardData = {
            ...formData,
            folderId: finalFolderId,
            isDraft: formData.isDraft ?? false,
          };
          
          await createCard(cardData);
          
          // Mark as saved
          setEditors(prev => prev.map(e => e.id === editorId ? { ...e, isSaved: true, autoFocus: false } : e));

          if (continueCreating) {
            toast.success('カードを追加しました');
            setEditors(prev => [
              ...prev.map(p => ({ ...p, autoFocus: false })),
              { id: nanoid(), isSaved: false, autoFocus: true }
            ]);
          } else {
            toast.success('カードを作成しました');
            navigate(`/FolderView?id=${targetFolderId}`);
          }
        }
      }
    } catch (error) {
      console.error('カード保存に失敗しました:', error);
      toast.error('保存に失敗しました。');
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(editorId);
        return next;
      });
    }
  };

  const handleDeleteEditor = (editorId) => {
    if (cardId) {
      // 既存カードの編集時はエディタ削除＝ナビゲーションバック
      handleCancel();
      return;
    }
    if (editors.length <= 1) {
      toast.error('これ以上削除できません');
      return;
    }
    setEditors(prev => prev.filter(e => e.id !== editorId));
    toast.info('カードを削除しました');
  };

  const handleMoveEditor = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= editors.length) return;
    
    setEditors(prev => {
      const items = [...prev];
      const [movedItem] = items.splice(index, 1);
      items.splice(newIndex, 0, movedItem);
      return items;
    });
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(editors);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setEditors(items);
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
      <div className="max-w-[1400px] mx-auto p-2 md:pt-8 md:pb-10 md:px-4">
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
        
        {/* Editor Area */}
        <div className="space-y-12 mt-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="editors-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-12">
                  {editors.map((editor, index) => (
                    <Draggable 
                      key={editor.id} 
                      draggableId={editor.id} 
                      index={index} 
                      isDragDisabled={!!cardId}
                      lockAxis="y"
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={{
                            ...provided.draggableProps.style,
                            transform: provided.draggableProps.style?.transform 
                              ? `translate(0px, ${provided.draggableProps.style.transform.split(',').pop()?.split(')')[0].trim() || '0px'})`
                              : undefined
                          }}
                          className={`relative group transition-all ${snapshot.isDragging ? 'z-50' : ''}`}
                        >
                          {/* Connector Line */}
                          {!snapshot.isDragging && !cardId && index < editors.length - 1 && (
                            <div className="absolute left-1/2 -bottom-10 w-px h-10 bg-slate-200 -translate-x-1/2 z-0 hidden md:block" />
                          )}

                          {/* Controls (Outside Top Left) */}
                          {!cardId && (
                            <div className="absolute -top-10 left-0 flex items-center gap-1 z-20">
                              <div className="flex items-center bg-white rounded-full shadow-sm border border-slate-200 overflow-hidden">
                                <button
                                  onClick={() => handleMoveEditor(index, 'up')}
                                  disabled={index === 0}
                                  className="p-1.5 hover:bg-slate-50 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-slate-100"
                                  title="上へ移動"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleMoveEditor(index, 'down')}
                                  disabled={index === editors.length - 1}
                                  className="p-1.5 hover:bg-slate-50 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="下へ移動"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <div
                                {...provided.dragHandleProps}
                                className="p-1.5 cursor-grab active:cursor-grabbing rounded-full bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors hidden md:flex"
                                title="ドラッグして並べ替え"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteEditor(editor.id)}
                                className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                title="このカードを削除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}

                          <div className={cn(
                            "relative bg-white rounded-[32px] border border-slate-200/60 shadow-sm p-2 md:p-6",
                            snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary-500/20 scale-[1.02]' : ''
                          )}>
                            <CardEditor
                              card={card}
                              folderId={targetFolderId}
                              questionNumber={questionNumberOffset + index + 1}
                              autoFocus={!!editor.autoFocus}
                              onSave={(data, cont) => handleSave(editor.id, data, cont)}
                              onCancel={handleCancel}
                              isLoading={savingIds.has(editor.id)}
                              showContinueButton={!cardId && index === editors.length - 1}
                              showSaveButton={index === editors.length - 1}
                              showCancelButton={index === editors.length - 1}
                              availableTags={availableTags}
                              customDraftKey={cardId ? undefined : `cardedit_draft_${editor.id}`}
                              storageType={cardId ? 'local' : 'session'}
                              onDelete={() => handleDeleteEditor(editor.id)}
                              mode={mode}
                            />
                            
                            {/* Saved Overlay */}
                            {editor.isSaved && (
                              <div className="absolute -top-3 right-4 z-10 pointer-events-none animate-in fade-in zoom-in duration-500">
                                <div className="flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black shadow-sm border backdrop-blur-md bg-white/95 text-primary-600 border-primary-100">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-pulse" />
                                  保存済み
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}
