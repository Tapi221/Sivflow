import React from 'react';
import { cn } from '@/lib/utils';
import GripIcon from 'lucide-react/dist/esm/icons/grip-vertical';
import TrashIcon from 'lucide-react/dist/esm/icons/trash-2';
import CopyIcon from 'lucide-react/dist/esm/icons/copy';

interface BlockWrapperProps {
  children: React.ReactNode;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: unknown;
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

  // 1行移動（rowOffset）用
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;

  contentClassName?: string;
}

const STEP_PX = 24;

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
  contentClassName,
}: BlockWrapperProps) => {
  const [isEditingWithin, setIsEditingWithin] = React.useState(false);
  const isEditableFocusTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('input, textarea, [contenteditable="true"], [contenteditable=""]'));
  };

  // 実ボーダーは高さを+2pxして24pxグリッドを崩すため、常に inset box-shadow で描画する。
  const isOutlineVisible = Boolean(isActive || isEditingWithin);
  const outlineColor = accentColor ? `${accentColor}40` : 'rgba(59, 130, 246, 0.35)';
  const baseOutline = `inset 0 0 0 var(--card-ruled-line-px, 1px) var(--card-ruled-color, rgba(0,0,0,0.05))`;
  const activeOutline = `inset 0 0 0 var(--card-ruled-line-px, 1px) ${outlineColor}`;

  const stepDragRef = React.useRef<{
    pointerId: number;
    startY: number;
    appliedSteps: number;
  } | null>(null);

  const applyStepMoves = (deltaSteps: number) => {
    if (deltaSteps === 0) return 0;

    let applied = 0;

    if (deltaSteps > 0) {
      for (let i = 0; i < deltaSteps; i += 1) {
        if (!canMoveDown) break;
        onMoveDown?.();
        applied += 1;
      }
      return applied;
    }

    for (let i = 0; i < Math.abs(deltaSteps); i += 1) {
      if (!canMoveUp) break;
      onMoveUp?.();
      applied -= 1;
    }

    return applied;
  };

  const startStepDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragEnabled) return;
    if (!onMoveUp && !onMoveDown) return;
    if (!canMoveUp && !canMoveDown) return;

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
      const nextSteps = Math.round(deltaY / STEP_PX);
      const diff = nextSteps - stepDragRef.current.appliedSteps;

      if (diff !== 0) {
        const actuallyApplied = applyStepMoves(diff);
        stepDragRef.current.appliedSteps += actuallyApplied;
      }
    };

    const onPointerEnd = (endEvent: PointerEvent) => {
      if (!stepDragRef.current || endEvent.pointerId !== stepDragRef.current.pointerId) return;

      stepDragRef.current = null;

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
      onFocusCapture={(event) => {
        setIsEditingWithin(isEditableFocusTarget(event.target));
      }}
      onBlurCapture={(event) => {
        const nextFocused = event.relatedTarget as Node | null;
        if (!nextFocused || !event.currentTarget.contains(nextFocused)) {
          setIsEditingWithin(false);
          return;
        }
        setIsEditingWithin(isEditableFocusTarget(nextFocused));
      }}
      className={cn(
        'group relative overflow-visible bg-transparent py-0 px-1.5',
        isOutlineVisible && 'z-40',
        className
      )}
      style={{
        boxShadow: isOutlineVisible ? activeOutline : baseOutline,
        borderRadius: 'var(--block-frame-radius, 12px)',
      }}
    >
      {/* 操作メニュー (アクティブ時に表示) */}
      <div
        data-active={isActive ? 'true' : 'false'}
        className="absolute -right-1 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0 -space-y-px opacity-0 pointer-events-none
        group-hover:opacity-100 group-hover:pointer-events-auto
        group-focus-within:opacity-100 group-focus-within:pointer-events-auto
        data-[active=true]:opacity-100 data-[active=true]:pointer-events-auto
        transition-opacity duration-150 z-[80]"
      >
        {showDragHandle && (
          <div
            {...dragHandleProps}
            onPointerDown={startStepDrag}
            className={cn(
              'w-5 h-5 min-w-0 min-h-0 p-0 bg-white border border-slate-100 rounded-full text-slate-400 shadow-sm flex items-center justify-center flex-none transition-colors',
              'cursor-grab active:cursor-grabbing',
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
            type="button"
          >
            <CopyIcon className="w-2.5 h-2.5" />
          </button>
        )}

        {showDelete && (
          <button
            onClick={onDelete}
            className="w-5 h-5 min-w-0 min-h-0 p-0 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-red-600 hover:border-red-100 shadow-sm flex items-center justify-center flex-none"
            type="button"
          >
            <TrashIcon className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      <div data-block-measure-root="true" className={cn('relative px-1', contentClassName)}>
        {children}
      </div>
    </div>
  );
};
