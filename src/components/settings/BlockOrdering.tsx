import React, { useEffect, useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Switch } from '@/components/ui/switch';
import { GripVertical } from '@/ui/icons';
import { Type } from '@/ui/icons';
import { Code } from '@/ui/icons';
import { ImageIcon } from '@/ui/icons';
import { Sigma } from '@/ui/icons';
import { cn } from '@/lib/utils';
import type { BlockConfig } from '@/types';
import { useUserSettings } from '@/hooks/useUserSettings';

// Icon mapping
const ICONS = {
  text: Type,
  code: Code,
  image: ImageIcon,
  math: Sigma
};

const sanitizeBlockSettings = (items: BlockConfig[]) =>
  items
    .filter((item) => item.type !== 'reference' && item.type !== 'audio')
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item, index) => ({ ...item, orderIndex: index }));

export const BlockOrdering = () => {
  const { settings, updateSettings } = useUserSettings();
  const [blocks, setBlocks] = useState<BlockConfig[]>([]);
  const [enabled, setEnabled] = useState(false);
  const isDraggingRef = useRef(false);

  // StrictMode workaround for @hello-pangea/dnd
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  useEffect(() => {
    // ドラッグ中または更新中は何もしない
    if (isDraggingRef.current) return;

    if (settings?.editorBlockSettings) {
      const sorted = sanitizeBlockSettings([...settings.editorBlockSettings]);
      
      // 文字列表現で比較し、実際に変更がある場合のみステートを更新する（チラツキ防止）
      setBlocks(prev => {
        if (JSON.stringify(prev) === JSON.stringify(sorted)) return prev;
        return sorted;
      });
    } else {
        const defaults: BlockConfig[] = [
            { id: 'text', type: 'text', label: 'テキスト', isVisible: true, orderIndex: 0 },
            { id: 'code', type: 'code', label: 'コード', isVisible: true, orderIndex: 1 },
            { id: 'image', type: 'image', label: '画像', isVisible: true, orderIndex: 2 },
            { id: 'math', type: 'math', label: '数式', isVisible: true, orderIndex: 3 },
            { id: 'markdown', type: 'markdown', label: 'Markdown', isVisible: true, orderIndex: 4 },
        ];
        setBlocks(sanitizeBlockSettings(defaults));
    }
  }, [settings?.editorBlockSettings]);

  const onDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) {
      isDraggingRef.current = false;
      return;
    }

    // 1. まずローカルステートを即座に入れ替える
    const items = Array.from(blocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      orderIndex: index
    }));

    setBlocks(updatedItems);

    // 2. DB（Dexie）を更新する。await することで同期完了を待つ。
    // この間 isDraggingRef.current は true のままなので useEffect による上書きが防がれる。
    await updateSettings({ editorBlockSettings: updatedItems });
    
    // 3. 少し遅延させてからフラグを下ろす（ReactのレンダリングサイクルとDB更新の反映タイミングのズレを吸収）
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const handleToggleVisibility = (id: string, checked: boolean) => {
    const updatedItems = blocks.map(item => 
      item.id === id ? { ...item, isVisible: checked } : item
    );
    setBlocks(updatedItems);
    updateSettings({ editorBlockSettings: updatedItems });
  };

  if (!enabled) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <div className="font-bold text-slate-200 text-sm">ブロックエディタ設定</div>
      </div>
      <div className="text-xs text-slate-400 mb-2">
         エディタで使用するブロックの表示・非表示と並び順をカスタマイズできます。ドラッグして並び替えてください。
      </div>

      <DragDropContext onDragStart={onDragStart} onDragEnd={handleDragEnd}>
        <Droppable droppableId="block-ordering">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {blocks.map((block, index) => {
                const Icon = ICONS[block.type as keyof typeof ICONS] || Type;
                
                return (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 text-slate-200",
                          // ドラッグ中は transition-all を無効化して挙動を安定させる
                          !snapshot.isDragging && "transition-all hover:bg-white/10",
                          snapshot.isDragging && "shadow-[0_0_15px_rgba(123,172,170,0.3)] scale-[1.02] z-50 border-primary-400 ring-2 ring-primary-500/20 bg-slate-800/90 backdrop-blur-md"
                        )}
                        style={{
                          ...provided.draggableProps.style,
                          // Force vertical movement only by resetting X translation to 0
                          transform: provided.draggableProps.style?.transform 
                            ? `translate(0px, ${provided.draggableProps.style.transform.split(',').pop()?.split(')')[0].trim() || '0px'})`
                            : undefined,
                          '--drag-z-index': snapshot.isDragging ? 9999 : 1,
                          zIndex: 'var(--drag-z-index)'
                        } as any}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing p-1"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        
                        <div className={cn(
                            "p-2 rounded-lg bg-white/10",
                            !block.isVisible && "opacity-50 grayscale"
                        )}>
                            <Icon className="w-4 h-4 text-slate-300" />
                        </div>

                        <span className={cn(
                            "flex-1 text-sm font-bold text-slate-200",
                            !block.isVisible && "text-slate-500"
                        )}>
                          {block.label}
                        </span>

                        <Switch
                          checked={block.isVisible}
                          onCheckedChange={(checked) => handleToggleVisibility(block.id, checked)}
                        />
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};


