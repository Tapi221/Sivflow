import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCards } from '@/hooks/useCards';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, GripVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { createPageUrl } from '@/utils';
import CardEditor from '@/components/card/CardEditor';
import { addDays } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCardEntity } from '@/hooks/useCardEntity';

const CARD_EDIT_RELOAD_GUARD_KEY = 'card-edit:reload-guard-url';
const CARD_EDIT_EDITORS_KEY = 'card-edit-editors';
const CARD_EDIT_FOLDER_ID_KEY = 'card-edit:folder-id';

const normalizeEditors = (rawEditors) => {
  if (!Array.isArray(rawEditors)) return [];

  const usedIds = new Set();

  return rawEditors.map((editor, index) => {
    const candidateId = typeof editor?.id === 'string' ? editor.id.trim() : '';
    const uniqueId = candidateId && !usedIds.has(candidateId) ? candidateId : nanoid();
    usedIds.add(uniqueId);

    return {
      id: uniqueId,
      isSaved: !!editor?.isSaved,
      autoFocus: !!editor?.autoFocus && index === rawEditors.length - 1,
    };
  });
};

export default function CardEdit() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  
  const cardId = searchParams.get('id');
  const folderId = searchParams.get('folderId');
  const mode = searchParams.get('mode') || 'default';
  const hideTitle = searchParams.get('hideTitle') === 'true';
  const returnTo = searchParams.get('returnTo');
  const shouldReturnToCardView = returnTo === 'card-view';
  const shouldReturnToCalendar = returnTo === 'calendar';
  
  // 🔍 デバッグ：コンポーネントマウント時のURL確認
  useEffect(() => {
    console.log('[CardEdit] Component mounted/updated', {
      cardId,
      folderId,
      pathname: window.location.pathname,
      search: window.location.search,
    });
  }, [cardId, folderId]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [savingIds, setSavingIds] = useState(new Set());
  const isUnloadingRef = useRef(false);
  
  // リロードガードを同期的に初期化（useEffectより前に実行される）
  const suppressAutoNavigateAfterReloadRef = useRef((() => {
    if (typeof window === 'undefined') return false;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    const guardedUrl = sessionStorage.getItem(CARD_EDIT_RELOAD_GUARD_KEY);
    return guardedUrl === currentUrl;
  })());

  useEffect(() => {
    if (!suppressAutoNavigateAfterReloadRef.current) {
      sessionStorage.removeItem(CARD_EDIT_RELOAD_GUARD_KEY);
      return;
    }

    // リロード直後の場合、3秒後にガードを解除
    const timerId = window.setTimeout(() => {
      suppressAutoNavigateAfterReloadRef.current = false;
      sessionStorage.removeItem(CARD_EDIT_RELOAD_GUARD_KEY);
    }, 3000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    const markUnloading = () => {
      isUnloadingRef.current = true;
      sessionStorage.setItem(CARD_EDIT_RELOAD_GUARD_KEY, currentUrl);
    };

    window.addEventListener('pagehide', markUnloading);
    window.addEventListener('beforeunload', markUnloading);

    return () => {
      window.removeEventListener('pagehide', markUnloading);
      window.removeEventListener('beforeunload', markUnloading);
    };
  }, []);

  const safeNavigate = useCallback((to) => {
    if (isUnloadingRef.current) {
      console.log('[CardEdit] safeNavigate: blocked (unloading)', to);
      return;
    }
    console.log('[CardEdit] safeNavigate: executing', to);
    navigate(to);
  }, [navigate]);
  
  // useCardsフックから必要な関数とデータを取得
  const { cards: allCards = [], loading: cardsLoading, createCard, updateCard, deleteCard } = useCards();
  const { effectiveCard: card, flushDraft, hasDirtyDraft } = useCardEntity(cardId);
  
  // targetFolderId の決定（優先順位：URL > card.folderId > sessionStorage）
  const targetFolderId = useMemo(() => {
    if (folderId) {
      // URLにfolderIdがあれば最優先
      console.log('[CardEdit] targetFolderId: from URL', folderId);
      sessionStorage.setItem(CARD_EDIT_FOLDER_ID_KEY, folderId);
      return folderId;
    }
    if (card?.folderId) {
      // カードデータからfolderIdを取得
      console.log('[CardEdit] targetFolderId: from card', card.folderId);
      sessionStorage.setItem(CARD_EDIT_FOLDER_ID_KEY, card.folderId);
      return card.folderId;
    }
    // リロード直後などでまだ取得できない場合、sessionStorageから復元
    const savedFolderId = sessionStorage.getItem(CARD_EDIT_FOLDER_ID_KEY);
    console.log('[CardEdit] targetFolderId: from sessionStorage or undefined', savedFolderId || undefined);
    return savedFolderId || undefined;
  }, [folderId, card?.folderId]);
  
  const { cards: folderCards = [] } = useCards(targetFolderId);
  
  const sortedCards = useMemo(() => {
    return [...folderCards].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [folderCards]);
  
  // リロード時にエディタIDを維持するため sessionStorage で永続化（PairMode/FourChoiceMode と同じパターン）
  const [editors, setEditors] = useState(() => {
    if (cardId) {
      return [{ id: cardId, isSaved: false, autoFocus: true }];
    }
    // 新規作成時: sessionStorage から復元を試みる
    const saved = sessionStorage.getItem(CARD_EDIT_EDITORS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const normalized = normalizeEditors(parsed);
        if (normalized.length > 0) {
          // autoFocus を無効化して復元（リロード後に余計なフォーカスを避ける）
          return normalized.map(e => ({ ...e, autoFocus: false }));
        }
      } catch (e) {
        console.error('Failed to parse saved editors:', e);
      }
    }
    return [{ id: nanoid(), isSaved: false, autoFocus: true }];
  });

  useEffect(() => {
    if (cardId) return;

    setEditors((prev) => {
      const normalized = normalizeEditors(prev);
      const hasChanged = normalized.some((editor, index) => editor.id !== prev[index]?.id);
      return hasChanged ? normalized : prev;
    });
  }, [cardId]);

  // 永続化: 新規作成時のみエディタリストを sessionStorage に同期
  useEffect(() => {
    if (!cardId) {
      sessionStorage.setItem(CARD_EDIT_EDITORS_KEY, JSON.stringify(editors));
    }
  }, [editors, cardId]);

  // ページ離脱時に永続化データをクリア（リロードではない通常の画面遷移時）
  const clearEditorPersistence = useCallback(() => {
    sessionStorage.removeItem(CARD_EDIT_EDITORS_KEY);
    sessionStorage.removeItem(CARD_EDIT_FOLDER_ID_KEY);
  }, []);

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
  
  const handleSave = async (editorId, formData, continueCreating, saveContext) => {
    const isPageHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const isBackgroundSave = continueCreating === undefined;

    if (savingIds.has(editorId)) return;
    setSavingIds(prev => new Set(prev).add(editorId));
    
    try {
      if (cardId && card) {
        await updateCard(cardId, {
          ...formData,
          updatedAt: new Date()
        });
        if (!isBackgroundSave) {
          toast.success('カードを更新しました');
        }
        // リロードガード中、またはfolderIdが未確定の場合はナビゲートしない
        if (continueCreating === false && saveContext === 'manual-save' && targetFolderId && !isPageHidden && !suppressAutoNavigateAfterReloadRef.current) {
          await flushDraft();
          clearEditorPersistence();
          if (shouldReturnToCalendar) {
            safeNavigate(createPageUrl('Calendar'));
          } else if (shouldReturnToCardView) {
            safeNavigate(`/CardView?folderId=${targetFolderId}&cardId=${cardId}`);
          } else {
            safeNavigate(`/Folders?folderId=${targetFolderId}`);
          }
        }
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

          if (continueCreating === true) {
            toast.success('カードを追加しました');
            setEditors(prev => [
              ...prev.map(p => ({ ...p, autoFocus: false })),
              { id: nanoid(), isSaved: false, autoFocus: true }
            ]);
          } else if (continueCreating === false && saveContext === 'manual-save' && targetFolderId && !isPageHidden && !suppressAutoNavigateAfterReloadRef.current) {
            // リロードガード中、またはfolderIdが未確定の場合はナビゲートしない
            toast.success('カードを作成しました');
            clearEditorPersistence();
            if (shouldReturnToCalendar) {
              safeNavigate(createPageUrl('Calendar'));
            } else if (shouldReturnToCardView) {
              safeNavigate(`/CardView?folderId=${targetFolderId}`);
            } else {
              safeNavigate(`/Folders?folderId=${targetFolderId}`);
            }
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
      void handleCancel('user');
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
  
  const handleCancel = async (reason) => {
    if (isUnloadingRef.current) return;

    if (reason !== 'user') {
      console.log('[CardEdit] Cancel ignored: non-user trigger', reason);
      return;
    }
    
    // リロードガード中は何もしない（リロード直後のautosave等による誤動作防止）
    if (suppressAutoNavigateAfterReloadRef.current) {
      console.log('[CardEdit] Cancel ignored: reload guard active');
      return;
    }
    
    // folderIdが未確定の場合は待機（カードロード中）
    if (!targetFolderId) {
      console.log('[CardEdit] Cancel ignored: folderId not yet determined');
      return;
    }

    try {
      if (hasDirtyDraft) {
        await flushDraft();
      }
    } catch (error) {
      console.error('[CardEdit] flushDraft failed', error);
      toast.error('保存に失敗したため遷移を中止しました。');
      return;
    }

    clearEditorPersistence();
    
    if (shouldReturnToCalendar) {
      safeNavigate(createPageUrl('Calendar'));
      return;
    }

    if (shouldReturnToCardView) {
      safeNavigate(`/CardView?folderId=${targetFolderId}${cardId ? `&cardId=${cardId}` : ''}`);
      return;
    }

    safeNavigate(`/Folders?folderId=${targetFolderId}`);
  };
  
  if (cardId && cardsLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7F8] text-slate-800 p-6 md:p-14">
        <div className="max-w-[1400px] mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#F5F7F8] text-slate-800">
      <div className="max-w-[1400px] mx-auto px-0 pb-0 md:pt-8 md:pb-0 md:px-4">
        {/* Header */}
        <div
          className="flex items-center mb-1 px-4 md:px-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void handleCancel('user')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
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
                              <div className="hidden md:flex absolute top-2 left-2 md:top-3 md:left-3 items-center gap-1 z-20 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity">
                              <div className="flex items-center bg-white rounded-full shadow-sm border border-slate-200 overflow-hidden">
                                <button
                                  onClick={() => handleMoveEditor(index, 'up')}
                                  disabled={index === 0}
                                  className="p-1.5 hover:bg-slate-50 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-slate-100"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleMoveEditor(index, 'down')}
                                  disabled={index === editors.length - 1}
                                  className="p-1.5 hover:bg-slate-50 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <div
                                {...provided.dragHandleProps}
                                className="p-1.5 cursor-grab active:cursor-grabbing rounded-full bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors hidden md:flex"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteEditor(editor.id)}
                                className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}

                          <div className={cn(
                            "relative bg-white rounded-none border-0 shadow-none p-0 md:rounded-[32px] md:border md:border-slate-200/60 md:shadow-sm md:p-6",
                            snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary-500/20 scale-[1.02]' : ''
                          )}>
                            {!cardId && (
                              <div className="md:hidden px-3 pt-3 pb-1 flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => handleMoveEditor(index, 'up')}
                                  disabled={index === 0}
                                  className="h-10 min-w-10 px-2 rounded-xl border border-slate-200 bg-white text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ChevronUp className="w-4 h-4 mx-auto" />
                                </button>
                                <button
                                  onClick={() => handleMoveEditor(index, 'down')}
                                  disabled={index === editors.length - 1}
                                  className="h-10 min-w-10 px-2 rounded-xl border border-slate-200 bg-white text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ChevronDown className="w-4 h-4 mx-auto" />
                                </button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteEditor(editor.id)}
                                  className="h-10 w-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                            <CardEditor
                              card={card}
                              folderId={targetFolderId}
                              questionNumber={questionNumberOffset + index + 1}
                              autoFocus={!!editor.autoFocus}
                              onSave={(data, cont, context) => handleSave(editor.id, data, cont, context)}
                              onCancel={(reason) => void handleCancel(reason)}
                              isLoading={savingIds.has(editor.id)}
                              showContinueButton={!cardId && index === editors.length - 1}
                              showSaveButton={index === editors.length - 1}
                              showCancelButton={index === editors.length - 1}
                              availableTags={availableTags}
                              customDraftKey={cardId ? undefined : `cardedit_draft_${editor.id}`}
                              storageType={cardId ? 'local' : 'session'}
                              onDelete={!cardId ? () => handleDeleteEditor(editor.id) : undefined}
                              mode={mode}
                            />
                            
                            {/* Saved Overlay */}
                            {editor.isSaved && (
                              <div className="absolute top-2 right-3 md:-top-3 md:right-4 z-10 pointer-events-none animate-in fade-in zoom-in duration-500">
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
