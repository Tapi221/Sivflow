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
  dragHandleClassName?: string;
  className?: string;
  label?: string;
  icon?: React.ElementType;
  accentColor?: string;
  isActive?: boolean;
  showDelete?: boolean;
  showDuplicate?: boolean;
  showDragHandle?: boolean;
}

export const BlockWrapper = ({ 
  children, 
  onDelete, 
  onDuplicate, 
  dragHandleProps,
  dragHandleClassName,
  className,
  label,
  icon: Icon,
  accentColor,
  isActive,
  showDelete = true,
  showDuplicate = true,
  showDragHandle = true
}: BlockWrapperProps) => {
  return (
    <div 
      className={cn(
        "relative bg-white border-2 border-slate-100/80 rounded-[32px] p-1.5 transition-all duration-300 hover:border-primary-200 hover:shadow-sm",
        className
      )}
      style={{
        borderColor: accentColor ? `${accentColor}40` : undefined, // 25% opacity for subtle look
      }}
    >
      {/* 操作メニュー (ホバー時に表示、またはモバイル時はタップで表示) */}
      <div
        data-active={isActive ? "true" : "false"}
        className="absolute right-2 top-1 md:right-3 md:top-1 flex flex-row items-center gap-1 opacity-0 pointer-events-none
        data-[active=true]:opacity-100 data-[active=true]:pointer-events-auto
        transition-opacity duration-150 z-10"
      >
        {showDragHandle && (
          <div 
            {...dragHandleProps}
            className={cn(
              "w-5 h-5 min-w-0 min-h-0 p-0 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-primary-600 hover:border-primary-100 cursor-grab active:cursor-grabbing shadow-sm flex items-center justify-center flex-none",
              dragHandleClassName
            )}
          >
            <GripIcon className="w-2.5 h-2.5" />
          </div>
        )}
        {showDuplicate && (
          <button 
            onClick={onDuplicate}
            className="w-5 h-5 min-w-0 min-h-0 p-0 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm flex items-center justify-center flex-none"
            title="複製"
          >
            <CopyIcon className="w-2.5 h-2.5" />
          </button>
        )}
        {showDelete && (
          <button 
            onClick={onDelete}
            className="w-5 h-5 min-w-0 min-h-0 p-0 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-red-600 hover:border-red-100 shadow-sm flex items-center justify-center flex-none"
            title="削除"
          >
            <TrashIcon className="w-2.5 h-2.5" />
          </button>
        )}
      </div>


      <div className="relative pr-12 md:pr-14">
        {children}
      </div>
    </div>
  );
};


