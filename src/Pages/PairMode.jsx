import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CardEditor from '@/Components/card/CardEditor';
import { useCards } from '@/hooks/useCards';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useToast } from '@/contexts/ToastContext';
import { nanoid } from 'nanoid';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';

const PAIR_MODE_EDITORS_KEY = 'pair-mode-editors';

export default function PairMode() {
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get('folderId');
  const navigate = useNavigate();
  const { createCard } = useCards(folderId || undefined);
  const { settings } = useUserSettings();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const bottomRef = useRef(null);
  const isUnloadingRef = useRef(false);

  useEffect(() => {
    const markUnloading = () => {
      isUnloadingRef.current = true;
    };
    window.addEventListener('pagehide', markUnloading);
    window.addEventListener('beforeunload', markUnloading);
    return () => {
      window.removeEventListener('pagehide', markUnloading);
      window.removeEventListener('beforeunload', markUnloading);
    };
  }, []);

  const safeNavigate = useCallback((to) => {
    if (isUnloadingRef.current) return;
    navigate(to);
  }, [navigate]);

  // エディタのリストを管理。各エディタは一意のID、保存状態、オートフォーカスフラグを持つ。
  const [editors, setEditors] = useState(() => {
    const saved = sessionStorage.getItem(PAIR_MODE_EDITORS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved editors:', e);
      }
    }
    return [{ id: nanoid(), initialData: null, isSaved: false, autoFocus: true }];
  });

  const [savingIds, setSavingIds] = useState(new Set());

  // 永続化: エディタリストを sessionStorage に同期
  useEffect(() => {
    sessionStorage.setItem(PAIR_MODE_EDITORS_KEY, JSON.stringify(editors));
  }, [editors]);

  const clearPersistence = () => {
    sessionStorage.removeItem(PAIR_MODE_EDITORS_KEY);
  };

  // 新しいエディタが追加されたときに一番下までスクロール
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [editors.length]);

  const saveWithRetry = async (cardData, editorId, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[PairMode] 保存試行 ${attempt}/${maxRetries} for editorId=${editorId}`);
        const result = await createCard({
          ...cardData,
          folderId: folderId,
          questionBlocks: cardData.questionBlocks || [],
          answerBlocks: cardData.answerBlocks || [],
        });
        console.log('[PairMode] 保存成功:', result.id);
        return result;
      } catch (error) {
        console.error(`[PairMode] 保存失敗 (試行${attempt}):`, error);
        if (attempt === maxRetries) throw error;
        
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  };

  const handleSave = async (editorId, cardData, continueCreating) => {
    if (savingIds.has(editorId)) return;

    setSavingIds(prev => new Set(prev).add(editorId));
    
    try {
      const editorIndex = editors.findIndex(e => e.id === editorId);
      const questionNum = editorIndex >= 0 ? editorIndex + 1 : 1;

      await saveWithRetry(cardData, editorId);

      setEditors(prev => prev.map(e => e.id === editorId ? { ...e, isSaved: true, autoFocus: false } : e ));

      if (continueCreating === true) {
        toastSuccess(`カードを追加しました (Q${questionNum})`);

        setEditors(prev => [
          ...prev.map(p => ({ ...p, autoFocus: false })),
          { id: nanoid(), initialData: null, isSaved: false, autoFocus: true }
        ]);
      } else if (continueCreating === false) {
        toastSuccess('カードを作成しました');
        clearPersistence();
        safeNavigate(`/FolderView?id=${folderId}`);
      }
    } catch (error) {
      console.error('Failed to save card after retries:', error);
      toastError('保存に失敗しました。通信環境を確認して再度お試しください。');
    } finally {
      setSavingIds(prev => {
          const next = new Set(prev);
          next.delete(editorId);
          return next;
      });
    }
  };

  const handleCancel = () => {
    clearPersistence();
    safeNavigate(`/FolderView?id=${folderId}`);
  };

  const handleDelete = (editorId) => {
    if (editors.length <= 1) {
      toastError('これ以上削除できません');
      return;
    }
    setEditors(prev => prev.filter(e => e.id !== editorId));
    toastInfo('カードを削除しました');
  };

  const handleMove = (index, direction) => {
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

  return (
    <div className="min-h-screen bg-[#F8FAFB] w-full">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 md:px-8 h-14 md:h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 -ml-2 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded text-xs">ペアモード</span>
              <span>作成画面</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              用語と意味をペアで入力中
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-3 md:py-5 max-w-[1400px] space-y-4 px-4 md:px-8">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="editors-list">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-12 mt-8">
                {editors.map((editor, index) => (
                  <Draggable key={editor.id} draggableId={editor.id} index={index} lockAxis="y">
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
                        {!snapshot.isDragging && index < editors.length - 1 && (
                          <div className="absolute left-1/2 -bottom-10 w-px h-10 bg-slate-200 -translate-x-1/2 z-0 hidden md:block" />
                        )}

                        {/* Controls (Outside Top Left) */}
                        <div className="absolute -top-10 left-0 flex items-center gap-1 z-20">
                            <div className="flex items-center bg-white rounded-full shadow-sm border border-slate-200 overflow-hidden">
                                <button
                                    onClick={() => handleMove(index, 'up')}
                                    disabled={index === 0}
                                    className="p-1.5 hover:bg-slate-50 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-slate-100"
                                    title="上へ移動"
                                >
                                    <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleMove(index, 'down')}
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
                                onClick={() => handleDelete(editor.id)}
                                className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                title="このカードを削除"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className={cn(
                          "relative",
                          "bg-white rounded-[32px] border border-slate-200/60 shadow-sm",
                          "p-2 md:p-6",
                          "pt-4 md:pt-6", 
                          snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary-500/20 scale-[1.02]' : ''
                        )}>
                          <CardEditor
                            folderId={folderId}
                            questionNumber={index + 1}
                            autoFocus={!!editor.autoFocus}
                            onSave={(data, cont) => handleSave(editor.id, data, cont)}
                            onCancel={handleCancel}
                            isLoading={savingIds.has(editor.id)}
                            showContinueButton={index === editors.length - 1}
                            showSaveButton={index === editors.length - 1}
                            showCancelButton={index === editors.length - 1}
                            customDraftKey={`pairmode_draft_${editor.id}`}
                            storageType="session"
                            mode="pair"
                            canMoveUp={index > 0}
                            canMoveDown={index < editors.length - 1}
                            onMoveUp={() => handleMove(index, 'up')}
                            onMoveDown={() => handleMove(index, 'down')}
                            onDelete={() => handleDelete(editor.id)}
                          />
                        </div>

                        {editor.isSaved && (
                          <div className="absolute -top-3 right-4 z-10 pointer-events-none animate-in fade-in zoom-in duration-500">
                            <div 
                              className="flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black shadow-sm border backdrop-blur-md bg-white/95"
                              style={{ 
                                borderColor: `${settings?.accentColor}30`,
                                color: settings?.accentColor
                              }}
                            >
                              <div 
                                className="w-1.5 h-1.5 rounded-full animate-pulse"
                                style={{ backgroundColor: settings?.accentColor }}
                              />
                              保存済み
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <div ref={bottomRef} className="h-20" />
      </div>
    </div>
  );
}
