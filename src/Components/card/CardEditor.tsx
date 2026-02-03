import React, { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import AutoResizeTextarea from '@/Components/ui/AutoResizeTextarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Switch } from '@/Components/ui/switch';
import { Badge } from '@/Components/ui/badge';
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
import MathRenderer from '@/Components/math/MathRender';
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
  const draftKey = card ? `card-editor-draft-${card.id}` : `card-editor-draft-new`;
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    // Attempt to restore draft on mount
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData(prev => ({ ...prev, ...parsed }));
        setIsRestored(true);
        // Clear restoration message after 5 seconds
        setTimeout(() => setIsRestored(false), 5000);
      } catch (e) {
        console.error('Failed to parse draft:', e);
      }
    } else if (card) {
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
        // Initial state for new card
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
  }, [card, folderId, draftKey, defaultToTextBlock]);

  // Auto-save logic
  useEffect(() => {
    if (settings?.autoSaveEnabled === false) return;

    const timeoutId = setTimeout(() => {
      // Don't save if it's identical to the initial card state (very simplified check)
      // or if everything is empty
      localStorage.setItem(draftKey, JSON.stringify(formData));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [formData, draftKey]);

  const clearDraft = () => {
    localStorage.removeItem(draftKey);
  };

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


  
  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 復元通知 */}
      {isRestored && (
        <div 
          className="mx-4 p-3 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-500 flex items-center justify-center gap-2 border shadow-sm"
          style={{ 
            backgroundColor: `${settings?.accentColor}10`,
            borderColor: `${settings?.accentColor}20`,
            ['--accent-color' as any]: settings?.accentColor
          }}
        >
          <RefreshCw 
            className="w-4 h-4 animate-spin-slow" 
            style={{ color: 'var(--accent-color)' }}
          />
          <p 
            className="text-xs font-bold"
            style={{ color: 'var(--accent-color)' }}
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

      {/* トップバナー：カード番号、耐性スコア、タイトル、および各種トグル */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 px-4">
        <div className="flex flex-1 items-start gap-4 md:gap-8">
            <div className="flex flex-col gap-4 min-w-[max-content]">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] mb-1">Index</span>
                    <span className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tighter italic leading-none">
                        Q<span className="text-primary-600">{questionNumber}</span>
                    </span>
                </div>
                
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] mb-1 text-nowrap">耐性スコア</span>
                    <div className="flex items-center gap-2">
                        {card ? (
                            (() => {
                                // Calculate Resistance Score
                                const resistance = calculateResistanceScore(card.interval ?? 0);
                                const phase = getResistancePhase(resistance);
                                return (
                                    <Badge variant="outline" className={cn("rounded-full px-4 py-1 text-[10px] font-extrabold border-none", phase.colorClass)}>
                                        {resistance}%
                                    </Badge>
                                );
                            })()
                        ) : (
                            <Badge variant="outline" className="rounded-full px-4 py-1 text-[10px] font-extrabold bg-primary-600/10 text-primary-600 border-none">
                                新規作成
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col flex-1 min-w-[200px] gap-4">
                {/* タイトル入力 (条件付き表示) */}
                {!hideTitle && (
                  <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] mb-1">タイトル</span>
                      <div className="relative group">
                          <Input
                            id="title-header"
                            ref={titleInputRef}
                            value={formData.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            placeholder="タイトルを入力（任意）"
                            className="bg-slate-50 border-none h-10 rounded-xl px-4 text-slate-700 font-bold placeholder:text-slate-200 focus-visible:ring-indigo-500/10 transition-all text-sm"
                          />
                      </div>
                  </div>
                )}

                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        <Tag className="w-3 h-3 text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">タグ</span>
                    </div>
                    <TagInput 
                        tags={formData.tags || []} 
                        availableTags={availableTags}
                        rootFolderId={folderId}
                        onChange={(tags) => handleChange('tags', tags)} 
                        className="bg-slate-50 border-none min-h-[40px] rounded-xl px-3 py-1.5 transition-all"
                        placeholder="タグを追加"
                    />
                </div>
            </div>

            {/* 各種トグル (タイトル右側) */}
            <div className="flex items-center gap-2 md:gap-4 bg-slate-50 p-1.5 rounded-xl border border-slate-100/50 mt-4 md:mt-0 self-start">
                <div className="flex items-center gap-2 px-2">
                    <Switch
                        id="draft-switch"
                        checked={formData.isDraft}
                        onCheckedChange={(checked) => handleChange('isDraft', checked)}
                    />
                    <Label htmlFor="draft-switch" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hidden sm:block">下書き</Label>
                </div>
                
                <div className="w-[1px] h-4 bg-slate-200"></div>

                <button 
                    title="ブックマーク"
                    aria-label="ブックマーク"
                    className={cn(
                        "p-1.5 rounded-lg transition-all",
                        formData.isBookmarked ? "text-primary-600 bg-primary-600/10" : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"
                    )}
                     onClick={() => handleChange('isBookmarked', !formData.isBookmarked)}
                >
                    <Bookmark className={cn("w-4 h-4", formData.isBookmarked && "fill-current")} />
                </button>
                
                <div className="w-[1px] h-4 bg-slate-200"></div>

                <button 
                    title="不確実フラグ"
                    aria-label="不確実フラグ"
                    className={cn(
                        "p-1.5 rounded-lg transition-all",
                        formData.hasUncertainty ? "bg-amber-100 text-amber-600" : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"
                    )}
                    onClick={() => handleChange('hasUncertainty', !formData.hasUncertainty)}
                >
                    <HelpCircle className="w-4 h-4" />
                </button>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-3 bg-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-slate-50 group hover:border-slate-100 transition-all cursor-pointer select-none" onClick={() => setShowPreview(!showPreview)}>
                <Label htmlFor="preview-toggle" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer">プレビュー</Label>
                <Switch
                    id="preview-toggle"
                    checked={showPreview}
                    onCheckedChange={setShowPreview}
                />
            </div>
        </div>
      </div>
      

      
      {/* 問題と解答セクション */}
      <DragDropContext onDragEnd={(result) => {
        if (!result.destination) return;
        
        const { source, destination } = result;
        const sourceId = source.droppableId;
        const destId = destination.droppableId;
        
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
        <div className="grid lg:grid-cols-2 gap-12 px-2 md:px-4">
          <BlockEditor 
            blocks={formData.questionBlocks} 
            onChange={(blocks) => handleChange('questionBlocks', blocks)}
            prefix="question"
            label="問題"
            color="text-indigo-500"
            droppableId="question-blocks"
            accentColor={settings?.accentColor}
            duplicateToOpposite={settings?.duplicateToOpposite}
            onCrossDuplicate={(block) => {
                // Add to Answer side
                const newBlock = { ...block, id: `answer-${block.type}-${Date.now()}`, orderIndex: formData.answerBlocks.length };
                handleChange('answerBlocks', [...formData.answerBlocks, newBlock]);
            }}
          />
          <BlockEditor 
            blocks={formData.answerBlocks} 
            onChange={(blocks) => handleChange('answerBlocks', blocks)}
            prefix="answer"
            label="解答"
            color="text-emerald-500"
            droppableId="answer-blocks"
            accentColor={settings?.accentColor}
            duplicateToOpposite={settings?.duplicateToOpposite}
            onCrossDuplicate={(block) => {
                // Add to Question side
                const newBlock = { ...block, id: `question-${block.type}-${Date.now()}`, orderIndex: formData.questionBlocks.length };
                handleChange('questionBlocks', [...formData.questionBlocks, newBlock]);
            }}
          />
        </div>
      </DragDropContext>

      {/* リアルカードプレビューセクション */}
          {showPreview && (
        <div className="pt-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center gap-3 px-4">
              <div className="p-2 rounded-xl bg-primary-600/10">
                <Search className="w-5 h-5 text-primary-600" />
              </div>
              <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">リアルカードプレビュー</span>
           </div>
           
           <div className="bg-slate-50/50 p-4 md:p-8 rounded-3xl md:rounded-[50px] border border-slate-100/50">
              <Flashcard 
                card={formData} 
                previewMode={true}
              />
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
                  className="w-full md:w-auto rounded-full px-8 h-12 md:h-14 font-extrabold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm border"
                  style={{ 
                    backgroundColor: `${settings?.accentColor}08`, // 8% opacity
                    borderColor: `${settings?.accentColor}30`,      // 30% opacity
                    color: settings?.accentColor
                  }}
              >
                  <Plus className="w-5 h-5" style={{ color: settings?.accentColor }} />
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