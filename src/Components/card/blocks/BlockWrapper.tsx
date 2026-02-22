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
  dragEnabled?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;
  contentClassName?: string;
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
  showDragHandle = true,
  dragEnabled = true,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onMoveDragStart,
  onMoveDragEnd,
  contentClassName
}: BlockWrapperProps) => {
  const stepDragRef = React.useRef<{
    pointerId: number;
    startY: number;
    appliedSteps: number;
  } | null>(null);

  const applyStepMoves = (deltaSteps: number) => {
    if (deltaSteps > 0) {
      for (let i = 0; i < deltaSteps; i += 1) {
        onMoveDown?.();
      }
      return;
    }

    if (deltaSteps < 0) {
      for (let i = 0; i < Math.abs(deltaSteps); i += 1) {
        onMoveUp?.();
      }
    }
  };

  const startStepDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!onMoveUp && !onMoveDown) return;

    event.preventDefault();
    event.stopPropagation();

    const pointerId = event.pointerId;
    onMoveDragStart?.();
    stepDragRef.current = {
      pointerId,
      startY: event.clientY,
      appliedSteps: 0,
    };

    const target = event.currentTarget;
    target.setPointerCapture(pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!stepDragRef.current || moveEvent.pointerId !== stepDragRef.current.pointerId) return;

      const deltaY = moveEvent.clientY - stepDragRef.current.startY;
      const nextSteps = Math.round(deltaY / 24);
      const diff = nextSteps - stepDragRef.current.appliedSteps;

      if (diff !== 0) {
        applyStepMoves(diff);
        stepDragRef.current.appliedSteps = nextSteps;
      }
    };

    const onPointerEnd = (endEvent: PointerEvent) => {
      if (!stepDragRef.current || endEvent.pointerId !== stepDragRef.current.pointerId) return;
      const appliedSteps = stepDragRef.current.appliedSteps;
      stepDragRef.current = null;

      if (appliedSteps === 0) {
        if (endEvent.shiftKey) {
          onMoveUp?.();
        } else {
          onMoveDown?.();
        }
      }

      onMoveDragEnd?.();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
  };

  return (
    <div 
      className={cn(
        "relative overflow-visible bg-white border border-slate-200/80 rounded-xl py-0 px-1.5 transition-all duration-300 hover:border-primary-200 hover:shadow-sm",
        isActive && "z-40",
        className
      )}
      style={{
        borderColor: accentColor ? `${accentColor}40` : undefined,
      }}
    >
      {/* 操作メニュー (ホバー時に表示、またはモバイル時はタップで表示) */}
      <div
        data-active={isActive ? "true" : "false"}
        className="absolute -right-1 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0 -space-y-px opacity-0 pointer-events-none
        data-[active=true]:opacity-100 data-[active=true]:pointer-events-auto
        transition-opacity duration-150 z-[80]"
      >
        {showDragHandle && (
          <div 
            {...dragHandleProps}
            onPointerDown={startStepDrag}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              if (event.shiftKey) {
                if (canMoveUp) onMoveUp?.();
                return;
              }
              if (canMoveDown) onMoveDown?.();
            }}
            className={cn(
              "w-5 h-5 min-w-0 min-h-0 p-0 bg-white border border-slate-100 rounded-full text-slate-400 shadow-sm flex items-center justify-center flex-none transition-colors",
              "cursor-grab active:cursor-grabbing",
              dragHandleClassName
            )}
            title="クリック: 1行下へ / Shift+クリック: 1行上へ"
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


      <div className={cn("relative px-1", contentClassName)}>
        {children}
      </div>
    </div>
  );
};


