import React from 'react';
import { BlockWrapper } from './BlockWrapper';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import PlusIcon from 'lucide-react/dist/esm/icons/plus';
import XIcon from 'lucide-react/dist/esm/icons/x';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import type { ReferenceBlockData } from '@/types';
import { cn } from '@/lib/utils';

interface ReferenceBlockProps {
  references: ReferenceBlockData[];
  onChange: (references: ReferenceBlockData[]) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: any;
  accentColor?: string;
  isActive?: boolean;
  showDelete?: boolean;
}

export const ReferenceBlock = ({ 
  references = [], 
  onChange, 
  onDelete, 
  onDuplicate, 
  dragHandleProps, 
  accentColor,
  isActive,
  showDelete
}: ReferenceBlockProps) => {
  
  const handleAddLink = () => {
    const newLink: ReferenceBlockData = {
      url: '',
      name: ''
    };
    onChange([...references, newLink]);
  };

  const handleUpdateLink = (index: number, updates: Partial<ReferenceBlockData>) => {
    const newReferences = [...references];
    newReferences[index] = { ...newReferences[index], ...updates };
    onChange(newReferences);
  };

  const handleRemoveLink = (index: number) => {
    onChange(references.filter((_, i) => i !== index));
  };

  return (
    <BlockWrapper 
      onDelete={onDelete} 
      onDuplicate={onDuplicate} 
      dragHandleProps={dragHandleProps}
      label="Reference"
      icon={LinkIcon}
      accentColor={accentColor}
      isActive={isActive}
      className="bg-slate-50/50"
      showDuplicate={false}
      showDragHandle={false}
      showDelete={showDelete}
    >
      <div className="p-1.5 space-y-1.5">
        {references.map((ref, index) => (
          <div key={index} className="relative bg-white p-2 rounded-xl border border-slate-100 shadow-sm group/link">
            <button 
              onClick={() => handleRemoveLink(index)}
              title="リンクを削除"
              className="absolute -top-1 -right-1 p-1 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 hover:border-red-200 opacity-0 group-hover/link:opacity-100 transition-opacity z-20 shadow-sm"
            >
              <XIcon className="w-2.5 h-2.5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="bg-slate-50 p-1.5 rounded-lg text-slate-400">
                <LinkIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 flex gap-2">
                <Input 
                  value={ref.url}
                  onChange={(e) => handleUpdateLink(index, { url: e.target.value })}
                  placeholder="URL (https://...)"
                  autoComplete="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore
                  className={cn(
                    "h-8 text-[11px] rounded-lg border-slate-100 bg-slate-50/30 focus-visible:ring-primary-100 flex-[3]",
                    ref.url && (ref.url.startsWith('http://') || ref.url.startsWith('https://')) && "text-blue-600 underline decoration-blue-200"
                  )}
                />
                <Input 
                  value={ref.name}
                  onChange={(e) => handleUpdateLink(index, { name: e.target.value })}
                  placeholder="表示名"
                  autoComplete="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore
                  className="h-8 text-[11px] rounded-lg border-slate-100 bg-slate-50/30 focus-visible:ring-primary-100 flex-[2]"
                />
              </div>
            </div>
          </div>
        ))}

        <Button 
          variant="outline" 
          onClick={handleAddLink}
          className={cn(
            "w-full h-8 border-dashed border-2 text-slate-400 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50/30 rounded-xl font-bold flex items-center justify-center gap-2 text-[11px] transition-all",
            references.length > 0 ? "mt-1.5 border-slate-100 bg-slate-50/10" : "border-slate-200"
          )}
        >
          <PlusIcon className="w-3 h-3" />
          <span>{references.length > 0 ? "リンクを追加" : "リンクを設定"}</span>
        </Button>
      </div>
    </BlockWrapper>
  );
};
