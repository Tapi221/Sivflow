import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CardEditor from '@/Components/card/CardEditor';
import { useCards } from '@/hooks/useCards';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

const ONE_QA_EDITORS_KEY = 'one-qa-mode-editors';

export default function OneQAMode() {
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get('folderId');
  const hideTitle = searchParams.get('hideTitle') === 'true';
  const navigate = useNavigate();
  const { createCard } = useCards();
  const { settings } = useUserSettings();
  const bottomRef = useRef(null);

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

  const handleSave = async (editorId, cardData, continueCreating) => {
    // Prevent double submission
    if (savingIds.has(editorId)) return;

    setSavingIds(prev => new Set(prev).add(editorId));
    
    try {
      const editorIndex = editors.findIndex(e => e.id === editorId);
      const questionNum = editorIndex >= 0 ? editorIndex + 1 : 1;

      await createCard({
        ...cardData,
        folderId: folderId,
        questionBlocks: cardData.questionBlocks || [],
        answerBlocks: cardData.answerBlocks || [],
      });

      // Mark this editor as saved
      setEditors(prev => prev.map(e => e.id === editorId ? { ...e, isSaved: true, autoFocus: false } : e ));

      if (continueCreating) {
        toast.success(`カードを追加しました (Q${questionNum})`);

        // Add a new editor at the end and set it to autoFocus. Keep existing editors editable.
        setEditors(prev => [
          ...prev.map(p => ({ ...p, autoFocus: false })),
          { id: nanoid(), initialData: null, isSaved: false, autoFocus: true }
        ]);
      } else {
        toast.success('カードを作成しました');
        clearPersistence();
        navigate(`/folder/${folderId}`);
      }
    } catch (error) {
      console.error('Failed to save card:', error);
      toast.error('保存に失敗しました');
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
    navigate(`/folder/${folderId}`);
  };

  return (
    <div className="container mx-auto py-6 max-w-5xl min-h-screen bg-slate-50/50 space-y-4">
      {editors.map((editor, index) => (
        <div key={editor.id} className="relative">
             {/* Connector Line (Visual Polish) */}
             {index < editors.length - 1 && (
                <div className="absolute left-1/2 -bottom-4 w-px h-4 bg-slate-200 -translate-x-1/2 z-0" />
             )}

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
            />
            
            {/* Overlay for saved cards (Optional: to indicate completion or prevent accidental edits) */}
            {editor.isSaved && (
                <div className="absolute top-4 right-14 z-10 pointer-events-none animate-in fade-in zoom-in duration-500">
                    <div 
                        className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black shadow-sm border backdrop-blur-md"
                        style={{ 
                            backgroundColor: `${settings?.accentColor}15`,
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
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
