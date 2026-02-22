import React, { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import AutoResizeTextarea from '@/Components/ui/AutoResizeTextarea';
import { Switch } from '@/Components/ui/switch';
import {
  X,
  HelpCircle,
  Image as ImageIcon,
  StickyNote,
  Save,
  Plus,
  ArrowRight,
  Sparkles,
  Search,
  CheckCircle,
  Volume2,
  Tag,
  Bookmark,
  RefreshCw
} from 'lucide-react';

import { TagInput } from '@/Components/ui/tag-input';
import MediaUploader from '@/Components/card/MediaUploader';

import { cn } from '@/lib/utils';
import { getResistancePhase, normalizeMemoryStability } from '@/utils/reviewUtils';
import { calculateResistanceScore } from '@/utils/reviewMetrics';
import { CodeBlockEditor } from './CodeBlockEditor';
import { Flashcard } from './Flashcard';
import { BlockEditor } from './BlockEditor'; 
import { DragDropContext } from '@hello-pangea/dnd';
import { useUserSettings } from '@/hooks/useUserSettings';

interface SectionHeaderProps {
  icon: React.ElementType;
  label: string;
  color: string;
}

const SectionHeader = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 mb-2 md:mb-6">
    <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
  </div>
);

interface CardEditorProps {
  card?: any;
  folderId?: string;
  questionNumber?: number;
  onSave: (data: any, continueCreating?: boolean) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  showContinueButton?: boolean;
  availableTags?: string[];
  defaultToTextBlock?: boolean;
  autoFocus?: boolean;
  showCancelButton?: boolean;
  showSaveButton?: boolean;
  hideTitle?: boolean;
  mode?: 'default' | 'four_choice' | 'pair';
  customDraftKey?: string;
  storageType?: 'local' | 'session' | 'none';
}

export default function CardEditor({ 
  card,
  folderId,
  questionNumber = 1,
  onSave,
  onCancel,
  isLoading,
  showContinueButton = false,
  availableTags = [],
  defaultToTextBlock = false,
  autoFocus = false,
  showCancelButton = true,
  showSaveButton = true,
  hideTitle = false,
  mode = 'default',
  customDraftKey,
  storageType = 'local',
}: CardEditorProps) {
  const { settings } = useUserSettings();
  const [showPreview, setShowPreview] = useState(settings?.defaultPreviewEnabled ?? false);

  // 設定が変更され、まだ手動で切り替えていない場合にプレビュー状態を同期
  // または、初期状態のまま維持することも可能。通常は「デフォルト」の初期値で十分。
  useEffect(() => {
    if (settings && settings.defaultPreviewEnabled !== undefined) {
      setShowPreview(settings.defaultPreviewEnabled);
    }
  }, [settings?.defaultPreviewEnabled]);
  const [formData, setFormData] = useState({
    title: '',
    folderId: folderId || '',
    isDraft: false,
    hasUncertainty: false,
    questionText: '',
    questionImages: [],
    questionAudios: [],
    questionCode: null,
    questionMemo: '',
    questionBlocks: [], // 追加
    answerText: '',
    answerImages: [],
    answerAudios: [],
    answerCode: null,
    answerMemo: '',
    answerBlocks: [], // 追加
    tags: [],
    isBookmarked: false,
  });

  // Focus title input when requested
  const titleInputRef = React.useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (autoFocus && titleInputRef.current) {
      try {
        titleInputRef.current.focus();
        titleInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        // ignore focus errors
      }
    }
  }, [autoFocus]);

  // Draft storage key
  const draftKey = customDraftKey ?? (card ? `card-editor-draft-${card.id}` : `card-editor-draft-new`);
  const storage =
    storageType === 'session' ? sessionStorage : storageType === 'local' ? localStorage : null;
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    // ドラフト復元を試みる（storage が使用可能な場合のみ）
    if (storage) {
      const savedDraft = storage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setFormData(prev => ({ ...prev, ...parsed }));
          setIsRestored(true);
          // 5秒後に復元メッセージを消す
          setTimeout(() => setIsRestored(false), 5000);
          return; // ドラフト復元成功時はカードデータで上書きしない
        } catch (e) {
          console.error('Failed to parse draft:', e);
        }
      }
    }

    // ドラフトがない場合、または storage が null (storageType="none") の場合
    if (card) {
      // 既存カードのデータを反映
      setFormData({
        title: card.title || '',
        folderId: card.folderId || folderId || '',
        isDraft: card.isDraft || false,
        hasUncertainty: card.hasUncertainty || false,
        questionText: card.questionText || '',
        questionImages: card.questionImages || [],
        questionAudios: card.questionAudios || [],
        questionCode: card.questionCode || card.question_code || null,
        questionMemo: card.questionMemo || '',
        questionBlocks: card.questionBlocks || [],
        answerText: card.answerText || '',
        answerImages: card.answerImages || [],
        answerAudios: card.answerAudios || [],
        answerCode: card.answerCode || card.answer_code || null,
        answerMemo: card.answerMemo || '',
        answerBlocks: card.answerBlocks || [],
        tags: card.tags || [],
        isBookmarked: card.isBookmarked ?? card.is_bookmarked ?? false,
      });
    } else {
      // 新規カードの初期状態を設定
      if (mode === 'pair') {
        const questionBlocks = Array.from({ length: 2 }).map((_, i) => ({
          id: `question-text-${nanoid()}`, type: 'text', content: '', orderIndex: i
        }));
        const answerBlocks = Array.from({ length: 2 }).map((_, i) => ({
          id: `answer-text-${nanoid()}`, type: 'text', content: '', orderIndex: i
        }));
        setFormData(prev => ({
          ...prev,
          folderId: folderId || '',
          questionBlocks,
          answerBlocks
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          folderId: folderId || '',
          questionBlocks: defaultToTextBlock ? [{
            id: `question-text-${nanoid()}`,
            type: 'text',
            content: '',
            orderIndex: 0
          }] : [],
          answerBlocks: defaultToTextBlock ? [{
            id: `answer-text-${nanoid()}`,
            type: 'text',
            content: '',
            orderIndex: 0
          }] : [],
        }));
      }
    }
  }, [card, folderId, draftKey, defaultToTextBlock, mode, storage]);

  // ペアモード用の追加・削除ハンドラ
  const handleAddPairTextBlocks = () => {
    if (mode !== 'pair') return;
    const qId = `question-text-${nanoid()}`;
    const aId = `answer-text-${nanoid()}`;
    
    setFormData(prev => ({
      ...prev,
      questionBlocks: [...prev.questionBlocks, { id: qId, type: 'text', content: '', orderIndex: prev.questionBlocks.length }],
      answerBlocks: [...prev.answerBlocks, { id: aId, type: 'text', content: '', orderIndex: prev.answerBlocks.length }]
    }));
  };

  const handleDeletePair = (index: number) => {
    if (mode !== 'pair') return;
    if (index < 2) return;
    setFormData(prev => {
      const newQB = prev.questionBlocks.filter((_, i) => i !== index).map((b, i) => ({ ...b, orderIndex: i }));
      const newAB = prev.answerBlocks.filter((_, i) => i !== index).map((b, i) => ({ ...b, orderIndex: i }));
      return { ...prev, questionBlocks: newQB, answerBlocks: newAB };
    });
  };

  // Auto-save logic
  useEffect(() => {
    if (!storage) return;
    if (settings?.autoSaveEnabled === false) return;

    const timeoutId = setTimeout(() => {
      // Don't save if it's identical to the initial card state (very simplified check)
      // or if everything is empty
      storage.setItem(draftKey, JSON.stringify(formData));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [formData, draftKey, storage, settings?.autoSaveEnabled]);

  // 追加：ペアモードの左右ブロック数を強制的に揃える（最低2ペア）
  const normalizePairBlocks = (q: any, a: any) => {
    const qArr = Array.isArray(q) ? q : [];
    const aArr = Array.isArray(a) ? a : [];
    const target = Math.max(qArr.length, aArr.length, 2);

    const cloneEmpty = (tmpl: any) => {
      const next: any = { ...(tmpl ?? {}) };

      // id は必ず新規にする
      next.id = typeof nanoid === 'function' ? nanoid() : (crypto as any).randomUUID();

      // よくあるテキストキーを空にする（あなたの実装差異を雑に吸収）
      if ('text' in next) next.text = '';
      if ('content' in next) next.content = '';
      if ('value' in next) next.value = '';

      // type が無い実装でも破綻しないように保険
      if (!('type' in next)) next.type = 'text';

      return next;
    };

    const pad = (arr: any[]) => {
      const out = [...arr];
      while (out.length < target) out.push(cloneEmpty(out[0]));
      return out;
    };

    return {
      questionBlocks: pad(qArr),
      answerBlocks: pad(aArr),
    };
  };

  // 追加：ペアモード時に、左右のブロック数を自動で揃える
  useEffect(() => {
    if (mode !== 'pair') return;

    setFormData((prev: any) => {
      const normalized = normalizePairBlocks(prev?.questionBlocks, prev?.answerBlocks);

      const same =
        (prev?.questionBlocks?.length ?? 0) === normalized.questionBlocks.length &&
        (prev?.answerBlocks?.length ?? 0) === normalized.answerBlocks.length;

      return same
        ? prev
        : {
            ...prev,
            questionBlocks: normalized.questionBlocks,
            answerBlocks: normalized.answerBlocks,
          };
    });
  }, [mode]);

  const clearDraft = () => {
    if (!storage) return;
    storage.removeItem(draftKey);
  };

  useEffect(() => {
    if (card) return;
    if (!storage) return;
    return () => {
      storage.removeItem(draftKey);
    };
  }, [card, draftKey, storage]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = async () => {
    console.log('[CardEditor] Current formData:', formData);
    
    const hasBlocks = (blocks: any[]) => {
      return blocks.some(b => {
        if (b.type === 'text' || b.type === 'memo') return b.content?.trim();
        if (b.type === 'code') return b.code?.code;
        if (b.type === 'image') return b.images?.length > 0;
        if (b.type === 'audio') return b.audios?.length > 0;
        if (b.type === 'math') return b.math?.latex?.trim();
        if (b.type === 'reference') return b.references?.some((r: any) => (r.url?.trim() || r.name?.trim()));
        return false;
      });
    };

    const hasQuestionContent = hasBlocks(formData.questionBlocks);
    const hasAnswerContent = hasBlocks(formData.answerBlocks);
    
    const dataToSave = {
      ...formData,
      isDraft: settings?.autoDraftEnabled !== false && (!hasQuestionContent || !hasAnswerContent) ? true : formData.isDraft
    };
    
    await onSave(dataToSave);
    clearDraft();
  };

  // ARIA: avoid passing expressions directly into `aria-pressed`.
  // Precompute string values to satisfy axe/aria lint rules.
  const ariaPressedBookmark = formData.isBookmarked ? "true" : "false";
  const ariaPressedUncertainty = formData.hasUncertainty ? "true" : "false";
  const ariaPressedPreview = showPreview ? "true" : "false";


  
  return (
    <div 
      className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700"
      style={{ ['--accent-color' as any]: settings?.accentColor }}
    >
      {/* 復元通知 */}
      {isRestored && (
        <div 
          className="mx-4 p-3 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-500 flex items-center justify-center gap-2 border shadow-sm bg-[color:var(--accent-color)/0.1] border-[color:var(--accent-color)/0.2]"
        >
          <RefreshCw 
            className="w-4 h-4 animate-spin-slow text-[color:var(--accent-color)]" 
          />
          <p 
            className="text-xs font-bold text-[color:var(--accent-color)]"
          >
            編集中のデータを復元しました
          </p>
        </div>
      )}

      {/* 同期コンフリクトの通知 */}
      {card?.hasSyncConflict && card?.conflictDescription && (
        <div className="mx-4 p-5 bg-slate-50 border border-slate-100 rounded-[30px] animate-in fade-in slide-in-from-top-2 duration-500">
          <p className="text-xs text-slate-500 leading-relaxed italic text-center">
            {card.conflictDescription}
          </p>
        </div>
      )}

      {/* トップバナー：1列ヘッダー */}
      <div className="px-4">
        <div
          className={cn(
            "grid grid-cols-1 gap-3 items-center",
            // PCは完全に1列
            "lg:grid-cols-[96px_auto_minmax(0,1fr)_minmax(260px,420px)_auto_auto]"
          )}
        >
          {/* INDEX / Q */}
          <div className="h-14 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] leading-none">
              INDEX
            </span>
            <div className="flex items-end gap-2 leading-none">
              <span className="text-3xl font-extrabold text-slate-800 tracking-tighter italic">
                Q{questionNumber}
              </span>

              {!card ? (
                <span className="text-[10px] font-extrabold rounded-full px-3 py-1 bg-primary-600/10 text-primary-600">
                  新規
                </span>
              ) : null}
            </div>
          </div>

          {/* 左側の丸アイコン（ブックマーク / 不確実） */}
          <div className="h-14 flex items-center gap-3">
            <button
              type="button"
              title="ブックマーク"
              aria-label="ブックマーク"
              aria-pressed={ariaPressedBookmark}
              className={cn(
                "h-14 w-14 rounded-full bg-slate-50 border border-slate-100/50 flex items-center justify-center transition-all",
                formData.isBookmarked
                  ? "text-primary-600 bg-primary-600/10 border-primary-600/20"
                  : "text-slate-300 hover:text-slate-500 hover:border-slate-200"
              )}
              onClick={() => handleChange("isBookmarked", !formData.isBookmarked)}
            >
              <Bookmark className={cn("w-5 h-5", formData.isBookmarked && "fill-current")} />
            </button>

            <button
              type="button"
              title="不確実フラグ"
              aria-label="不確実フラグ"
              aria-pressed={ariaPressedUncertainty}
              className={cn(
                "h-14 w-14 rounded-full bg-slate-50 border border-slate-100/50 flex items-center justify-center transition-all",
                formData.hasUncertainty
                  ? "bg-amber-100 text-amber-600 border-amber-200"
                  : "text-slate-300 hover:text-slate-500 hover:border-slate-200"
              )}
              onClick={() => handleChange("hasUncertainty", !formData.hasUncertainty)}
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>

          {/* タイトル */}
          {!hideTitle ? (
            <div className="min-w-0">
              <Label htmlFor="title-header" className="sr-only">
                タイトル
              </Label>
              <div className="h-14 rounded-2xl bg-slate-50 border border-slate-100/50 flex items-center px-4 min-w-0">
                <Input
  id="title-header"
  ref={titleInputRef}
  value={formData.title}
  onChange={(e) => handleChange("title", e.target.value)}
  placeholder="タイトル（任意）"
  autoComplete="new-password"
  autoCorrect="off"
  autoCapitalize="off"
  spellCheck={false}
  name="__ignore_chrome_autofill_title"
  data-form-type="other"
  className="h-10 w-full bg-transparent border-none px-0 text-slate-700 font-bold placeholder:text-slate-200 focus-visible:ring-indigo-500/10 text-sm"
/>

              </div>
            </div>
          ) : (
            <div className="hidden lg:block" />
          )}

          {/* タグ：スクロールバーを出さず、1行で切る */}
          <div className="min-w-0">
            <Label className="sr-only">タグ</Label>
            <div className="h-14 rounded-2xl bg-slate-50 border border-slate-100/50 flex items-center px-4 min-w-0 overflow-hidden">
              <TagInput
                tags={formData.tags || []}
                availableTags={availableTags}
                rootFolderId={folderId}
                onChange={(tags) => handleChange("tags", tags)}
                placeholder="タグ"
                className={cn(
                  "bg-transparent border-none h-10 min-h-0 rounded-none px-0 py-0 w-full",
                  // 重要：autoスクロール禁止。見た目は切る（スクロールバーを出さない）
                  "overflow-hidden whitespace-nowrap"
                )}
              />
            </div>
          </div>

          {/* 作成中（下書き）トグル：showPreviewと絶対混ぜない */}
          <div className="h-14 flex items-center">
            <div className="h-14 rounded-2xl bg-slate-50 border border-slate-100/50 flex items-center gap-3 px-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                作成中
              </span>
              <Switch
                id="draft-switch"
                checked={formData.isDraft}
                onCheckedChange={(checked) => handleChange("isDraft", checked)}
              />
            </div>
          </div>

          {/* PREVIEW ボタン：プレビューの切替だけ */}
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className={cn(
              "h-14 rounded-2xl px-5 flex items-center gap-2 border transition-all select-none",
              showPreview
                ? "bg-primary-600/10 text-primary-700 border-primary-600/20"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
            )}
            aria-label="プレビュー切り替え"
          >
            <Search className="w-5 h-5" />
            <span className="text-xs font-extrabold tracking-widest">PREVIEW</span>
          </button>

        </div>
      </div>
    
      {/* 問題と解答セクション */}
      <div className="-mt-2 md:-mt-3">
      <DragDropContext onDragEnd={(result) => {
        if (!result.destination) return;
        
        const { source, destination } = result;
        const sourceId = source.droppableId;
        const destId = destination.droppableId;
        if (source.index === destination.index) return;
        
        const sourceList = sourceId === 'question-blocks' ? [...formData.questionBlocks] : [...formData.answerBlocks];
        const destList = destId === 'question-blocks' ? [...formData.questionBlocks] : [...formData.answerBlocks];
        
        const [movedItem] = sourceList.splice(source.index, 1);
        
        // IDを更新して移動先を識別可能にする (任意)
        if (sourceId !== destId) {
          movedItem.id = movedItem.id.replace(sourceId.split('-')[0], destId.split('-')[0]);
        }

        if (sourceId === destId) {
          sourceList.splice(destination.index, 0, movedItem);
          const reindexed = sourceList.map((item, index) => ({ ...item, orderIndex: index }));
          handleChange(sourceId === 'question-blocks' ? 'questionBlocks' : 'answerBlocks', reindexed);
        } else {
          destList.splice(destination.index, 0, movedItem);
          const reindexedSource = sourceList.map((item, index) => ({ ...item, orderIndex: index }));
          const reindexedDest = destList.map((item, index) => ({ ...item, orderIndex: index }));
          
          setFormData(prev => ({
            ...prev,
            [sourceId === 'question-blocks' ? 'questionBlocks' : 'answerBlocks']: reindexedSource,
            [destId === 'question-blocks' ? 'questionBlocks' : 'answerBlocks']: reindexedDest
          }));
        }
      }}>
        {(() => {
          const isPairMode = mode === 'pair';
          
          // ペアモード用の動的プレースホルダー生成
          const pairQuestionPlaceholders = isPairMode ? 
            Object.fromEntries(formData.questionBlocks.map((_, i) => [i, `ペア${i + 1}：用語・単語`])) : undefined;
          
          const pairAnswerPlaceholders = isPairMode ? 
            Object.fromEntries(formData.answerBlocks.map((_, i) => [i, `ペア${i + 1}：意味・説明`])) : undefined;

          return (
            <>
              <div className="grid lg:grid-cols-2 gap-12 px-2 md:px-4">
                <BlockEditor 
                  blocks={formData.questionBlocks} 
                  onChange={(blocks) => {
                    handleChange('questionBlocks', blocks)
                  }}
                  prefix="question"
                  label="問題"
                  color="text-indigo-500"
                  droppableId="question-blocks"
                  accentColor={settings?.accentColor}
                  duplicateToOpposite={settings?.duplicateToOpposite}
                  customPlaceholders={pairQuestionPlaceholders}
                  hideToolbar={false}
                  hiddenBlockTypes={isPairMode ? ['text', 'math', 'code'] : []}
                  onDelete={isPairMode ? handleDeletePair : undefined}
                  minDeletableIndex={isPairMode ? 2 : 0}
                  onCrossDuplicate={(block) => {
                      if (isPairMode) return;
                      // Add to Answer side
                      const newBlock = { ...block, id: `answer-${block.type}-${Date.now()}`, orderIndex: formData.answerBlocks.length };
                      handleChange('answerBlocks', [...formData.answerBlocks, newBlock]);
                  }}
                />
                <BlockEditor 
                  blocks={formData.answerBlocks} 
                  onChange={(blocks) => {
                    handleChange('answerBlocks', blocks)
                  }}
                  prefix="answer"
                  label="解答"
                  color="text-emerald-500"
                  droppableId="answer-blocks"
                  accentColor={settings?.accentColor}
                  duplicateToOpposite={settings?.duplicateToOpposite}
                  customPlaceholders={pairAnswerPlaceholders}
                  hideToolbar={false}
                  hiddenBlockTypes={isPairMode ? ['text', 'math', 'code'] : []}
                  onDelete={isPairMode ? handleDeletePair : undefined}
                  minDeletableIndex={isPairMode ? 2 : 0}
                  onCrossDuplicate={(block) => {
                      if (isPairMode) return;
                      // Add to Question side
                      const newBlock = { ...block, id: `question-${block.type}-${Date.now()}`, orderIndex: formData.questionBlocks.length };
                      handleChange('questionBlocks', [...formData.questionBlocks, newBlock]);
                  }}
                />
              </div>

              {isPairMode && (
                <div className="flex justify-center py-1 md:py-2">
                  <Button
                    variant="outline"
                    onClick={handleAddPairTextBlocks}
                    className="rounded-full gap-2 border-slate-200 text-slate-500 font-bold px-10 py-6 shadow-sm hover:border-primary-500 hover:text-primary-600 transition-all active:scale-95 bg-white/50 backdrop-blur-sm"
                  >
                    <Plus className="w-5 h-5" />
                    <span>ペアを追加</span>
                  </Button>
                </div>
              )}
            </>
          );
        })()}
      </DragDropContext>
      </div>

      {/* リアルカードプレビューセクション */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="w-full max-w-5xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-50/50 p-3 md:p-6 rounded-3xl md:rounded-[50px] border border-slate-100/50 shadow-2xl">
              <Flashcard 
                card={formData} 
                previewMode={true}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* アクションフッター */}
      {(showCancelButton || showContinueButton || showSaveButton) && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 md:pt-10 px-4">
          {showCancelButton && (
            <Button 
                variant="ghost" 
                onClick={() => {
                    clearDraft();
                    onCancel();
                }} 
                disabled={isLoading}
                className="w-full md:w-auto text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full px-8 h-12 font-bold flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              <span>キャンセル</span>
            </Button>
          )}

          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 w-full md:w-auto">
              {showContinueButton && (
              <Button 
                  onClick={async () => {
                      await onSave(formData, true);
                      clearDraft();
                  }} 
                  disabled={isLoading}
                  className="w-full md:w-auto rounded-full px-8 h-12 md:h-14 font-extrabold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm border bg-[color:var(--accent-color)/0.08] border-[color:var(--accent-color)/0.3] text-[color:var(--accent-color)]"
              >
                  <Plus className="w-5 h-5 text-[color:var(--accent-color)]" />
                  <span>続けて作成</span>
              </Button>
              )}
              
              {showSaveButton && (
                <Button 
                    onClick={handleSubmit} 
                    disabled={isLoading}
                    className="w-full md:w-auto bg-primary-600 hover:bg-primary-700 text-white rounded-full px-12 h-12 md:h-14 font-extrabold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-primary-600/20"
                >
                    {isLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    <span>保存</span>
                </Button>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
