import React from 'react';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import GripIcon from 'lucide-react/dist/esm/icons/grip-vertical';
import TrashIcon from 'lucide-react/dist/esm/icons/trash-2';
import CopyIcon from 'lucide-react/dist/esm/icons/copy';

interface BlockWrapperProps {
  children: React.ReactNode;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: any;
  className?: string;
  label?: string;
  icon?: React.ElementType;
  accentColor?: string;
}

export const BlockWrapper = ({ 
  children, 
  onDelete, 
  onDuplicate, 
  dragHandleProps,
  className,
  label,
  icon: Icon,
  accentColor
}: BlockWrapperProps) => {
  return (
    <div 
      className={cn(
        "group relative bg-white border-2 border-slate-100/80 rounded-[32px] p-1.5 transition-all duration-300 hover:border-primary-200 hover:shadow-sm",
        className
      )}
      style={{
        borderColor: accentColor ? `${accentColor}40` : undefined, // 25% opacity for subtle look
      }}
    >
      {/* 操作メニュー (ホバー時に表示、またはモバイル時は常に表示) */}
      <div className="absolute -right-2 top-4 md:-right-12 flex md:flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div 
          {...dragHandleProps}
          className="p-2 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-primary-600 hover:border-primary-100 cursor-grab active:cursor-grabbing shadow-sm"
        >
          <GripIcon className="w-4 h-4" />
        </div>
        <button 
          onClick={onDuplicate}
          className="p-2 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm"
          title="複製"
        >
          <CopyIcon className="w-4 h-4" />
        </button>
        <button 
          onClick={onDelete}
          className="p-2 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-red-600 hover:border-red-100 shadow-sm"
          title="削除"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>


      <div className="relative">
        {children}
      </div>
    </div>
  );
};
