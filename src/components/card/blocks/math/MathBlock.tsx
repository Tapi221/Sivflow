import React, { useCallback, useState } from "react";
import { Sigma } from "@web-renderer/chip/icons";
import { MathEditorDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.MathEditor";
import { BlockWrapper } from "@web-renderer/components/card/blocks/core/BlockWrapper";
import { cn } from "@web-renderer/lib/utils";
import { MathBlockPreviewPane } from "./MathBlockPreviewPane";
import type { MathBlockData } from "@/types";



interface MathBlockProps {
  data: MathBlockData;
  onChange: (data: MathBlockData) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: Record<string, unknown> | null;
  dragHandleClassName?: string;
  accentColor?: string;
  isBlockSelected?: boolean;
  showDelete?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;
  zoom?: number;
}



const MAX_LATEX_LENGTH = 10000;



const areMathBlockPropsEqual = (prev: MathBlockProps, next: MathBlockProps) =>
  prev.data === next.data &&
  prev.dragHandleClassName === next.dragHandleClassName &&
  prev.accentColor === next.accentColor &&
  prev.isBlockSelected === next.isBlockSelected &&
  prev.showDelete === next.showDelete &&
  prev.canMoveUp === next.canMoveUp &&
  prev.canMoveDown === next.canMoveDown &&
  prev.zoom === next.zoom;



const MathBlockInner: React.FC<MathBlockProps> = ({
  data,
  onChange,
  onDelete,
  onDuplicate,
  dragHandleProps,
  dragHandleClassName,
  accentColor,
  isBlockSelected,
  showDelete,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onMoveDragStart,
  onMoveDragEnd,
  zoom,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const latex = data?.latex ?? "";

  const handleLatexChange = useCallback(
    (nextLatex: string) => {
      if (nextLatex.length > MAX_LATEX_LENGTH) {
        const truncated = nextLatex.slice(0, MAX_LATEX_LENGTH);
        setError(
          `KaTeX文字列は最大 ${MAX_LATEX_LENGTH.toLocaleString()} 文字までです`,
        );
        onChange({ ...data, latex: truncated });
        return;
      }

      if (error) setError(null);
      onChange({ ...data, latex: nextLatex });
    },
    [data, onChange, error],
  );

  return (
    <BlockWrapper
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      className={cn(latex.trim().length > 0 && "border-transparent")}
      dragHandleProps={dragHandleProps}
      dragHandleClassName={dragHandleClassName}
      label="Math"
      icon={Sigma}
      accentColor={accentColor}
      isBlockSelected={Boolean(isBlockSelected || isEditorOpen)}
      showDelete={showDelete}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onMoveDragStart={onMoveDragStart}
      onMoveDragEnd={onMoveDragEnd}
    >
      <div className="space-y-1.5 px-2 py-0.5">
        <MathBlockPreviewPane
          interactive
          onActivate={() => setIsEditorOpen(true)}
          latex={latex}
          displayMode={data.displayMode ?? "block"}
          showPlaceholder
          placeholder="数式を入力..."
          className={cn("rounded-lg transition-colors", "hover:bg-slate-50")}
          zoom={zoom}
        />
        <MathEditorDialog
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          data={data}
          onChange={(next) => handleLatexChange(next.latex)}
          accentColor={accentColor}
          error={error}
        />
      </div>
    </BlockWrapper>
  );
};



const MathBlock = React.memo(MathBlockInner, areMathBlockPropsEqual);
MathBlock.displayName = "MathBlock";

export { MathBlock };
