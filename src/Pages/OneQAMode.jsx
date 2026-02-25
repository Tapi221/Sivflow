import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CardEditor from '@/Components/card/CardEditor';
import { useCards } from '@/hooks/useCards';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';

const ONE_QA_EDITORS_KEY = 'one-qa-mode-editors';

export default function OneQAMode() {
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get('folderId');
  const hideTitle = searchParams.get('hideTitle') === 'true';
  const navigate = useNavigate();
  const { createCard } = useCards(folderId || undefined);
  const { settings } = useUserSettings();
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

  // Manage list of editors. Each editor has a unique ID, optional initialData, save status, and autofocus flag.
  const [editors, setEditors] = useState(() => {
    const saved = sessionStorage.getItem(ONE_QA_EDITORS_KEY);
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

  // Persistence: sync editors list to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(ONE_QA_EDITORS_KEY, JSON.stringify(editors));
  }, [editors]);

  const clearPersistence = () => {
    sessionStorage.removeItem(ONE_QA_EDITORS_KEY);
  };

  // Auto-scroll to bottom when a new editor is added
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [editors.length]);

  const saveWithRetry = async (cardData, editorId, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[OneQAMode] 保存試行 ${attempt}/${maxRetries} for editorId=${editorId}`);
        const result = await createCard({
          ...cardData,
          folderId: folderId,
          questionBlocks: cardData.questionBlocks || [],
          answerBlocks: cardData.answerBlocks || [],
        });
        console.log('[OneQAMode] 保存成功:', result.id);
        return result;
      } catch (error) {
        console.error(`[OneQAMode] 保存失敗 (試行${attempt}):`, error);
        if (attempt === maxRetries) throw error;
        
        // 指数バックオフ (1s, 2s, 4s)
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  };

  const handleSave = async (editorId, cardData, continueCreating) => {
    // Prevent double submission
    if (savingIds.has(editorId)) return;

    setSavingIds(prev => new Set(prev).add(editorId));
    
    try {
      const editorIndex = editors.findIndex(e => e.id === editorId);
      const questionNum = editorIndex >= 0 ? editorIndex + 1 : 1;

      await saveWithRetry(cardData, editorId);

      // Mark this editor as saved
      setEditors(prev => prev.map(e => e.id === editorId ? { ...e, isSaved: true, autoFocus: false } : e ));

      if (continueCreating === true) {
        toast.success(`カードを追加しました (Q${questionNum})`);

        // Add a new editor at the end and set it to autoFocus. Keep existing editors editable.
        setEditors(prev => [
          ...prev.map(p => ({ ...p, autoFocus: false })),
          { id: nanoid(), initialData: null, isSaved: false, autoFocus: true }
        ]);
      } else if (continueCreating === false) {
        toast.success('カードを作成しました');
        clearPersistence();
        safeNavigate(`/Folders?folderId=${folderId}`);
      }
    } catch (error) {
      console.error('Failed to save card after retries:', error);
      toast.error('保存に失敗しました。通信環境を確認して再度お試しください。');
    } finally {
      setSavingIds(prev => {
          const next = new Set(prev);
          next.delete(editorId);
          return next;
      });
    }
  };

  const handleCancel = () => {
    // If we have unsaved changes, maybe warn? For now simple navigation.
    clearPersistence();
    safeNavigate(`/Folders?folderId=${folderId}`);
  };

  const handleDelete = (editorId) => {
    if (editors.length <= 1) {
      toast.error('これ以上削除できません');
      return;
    }
    setEditors(prev => prev.filter(e => e.id !== editorId));
    toast.info('カードを削除しました');
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
    <div className="container mx-auto py-3 md:py-5 max-w-[1400px] min-h-screen bg-slate-50/50 space-y-4 px-4 md:px-8">
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
                        // Force vertical movement only by resetting X translation to 0
                        transform: provided.draggableProps.style?.transform 
                          ? `translate(0px, ${provided.draggableProps.style.transform.split(',').pop()?.split(')')[0].trim() || '0px'})`
                          : undefined
                      }}
                      className={`relative group transition-all ${snapshot.isDragging ? 'z-50' : ''}`}
                    >
                      {/* Connector Line (Visual Polish) - Hidden while dragging */}
                      {!snapshot.isDragging && index < editors.length - 1 && (
                        <div className="absolute left-1/2 -bottom-10 w-px h-10 bg-slate-200 -translate-x-1/2 z-0 hidden md:block" />
                      )}

                      {/* Controls (Outside Top Left) */}
                      <div className="absolute -top-10 left-0 flex items-center gap-1 z-20">
                          {/* Reorder Buttons */}
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
                          
                          {/* Drag Handle (Hidden if using buttons, or keep as alternative) - keeping for now but minimal */}
                          <div
                            {...provided.dragHandleProps}
                            className="p-1.5 cursor-grab active:cursor-grabbing rounded-full bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors hidden md:flex"
                            title="ドラッグして並べ替え"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Delete Button */}
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
                          hideTitle={hideTitle}
                          questionNumber={index + 1}
                          autoFocus={!!editor.autoFocus}
                          onSave={(data, cont) => handleSave(editor.id, data, cont)}
                          onCancel={handleCancel}
                          isLoading={savingIds.has(editor.id)}
                          // Only show continue button for the last card
                          showContinueButton={index === editors.length - 1}
                          // Only show save button for the last card
                          showSaveButton={index === editors.length - 1}
                          // Only show cancel button for the last card
                          showCancelButton={index === editors.length - 1}
                          defaultToTextBlock={true}
                          customDraftKey={`qnamode_draft_${editor.id}`}
                          storageType="session"
                          // Pass down movement props just in case CardEditor needs to know (though we moved controls outside)
                          // We can remove internal controls from CardEditor if we want to be pure, but keeping props doesn't hurt.
                          canMoveUp={index > 0}
                          canMoveDown={index < editors.length - 1}
                          onMoveUp={() => handleMove(index, 'up')}
                          onMoveDown={() => handleMove(index, 'down')}
                          onDelete={() => handleDelete(editor.id)}
                        />
                      </div>

                      
                      {/* Overlay for saved cards (Repositioned to Top Right) */}
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
      <div ref={bottomRef} />
    </div>
  );
}
