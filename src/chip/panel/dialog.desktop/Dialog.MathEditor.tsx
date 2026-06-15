import AutoResizeTextarea from "@/chip/ui/AutoResizeTextarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/chip/panel/dialog.desktop/dialog/dialog";
import { MathRenderer } from "@/components/card/blocks/math/MathBlockContent";
import { cn } from "@/lib/utils";
import type { MathBlockData } from "@/types/domain/base";
import type { CSSProperties, FC } from "react";

type CSSCustomProperties = CSSProperties & Record<`--${string}`, string>;
interface MathEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: MathBlockData;
  onChange: (next: MathBlockData) => void;
  accentColor?: string;
  error?: string | null;
}

const EDITOR_LINE_HEIGHT = 24;
const EDITOR_MIN_ROWS = 8;
const EDITOR_MAX_HEIGHT = 420;
const MAX_LATEX_LENGTH = 10000;

const isHexColor = (color: string) => /^#[0-9a-fA-F]{3,8}$/.test(color);

const MathEditorDialog: FC<MathEditorDialogProps> = ({ open, onOpenChange, data, onChange, accentColor, error }) => {
  const ringColor = accentColor && isHexColor(accentColor) ? `${accentColor}40` : "var(--primary-color-alpha-40)";
  const latex = data?.latex ?? "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,780px)] max-w-96 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-4 py-3">
          <DialogTitle className="font-serif text-xs font-medium tracking-widest text-slate-500 uppercase">
            Math Editor
          </DialogTitle>
          <DialogDescription className="sr-only">
            数式を編集するダイアログ
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-3 pt-3 pb-4">
          <AutoResizeTextarea
            value={latex}
            onChange={(event) => onChange({ ...data, latex: event.target.value })}
            placeholder="例: x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}（複数式は空行 or $$...$$）"
            aria-label="LaTeX入力"
            minRows={EDITOR_MIN_ROWS}
            lineHeight={EDITOR_LINE_HEIGHT}
            allowInternalScroll={true}
            maxHeight={EDITOR_MAX_HEIGHT}
            autoFocus
            textareaClassName="font-serif"
            className={cn(
              "w-full resize-none whitespace-pre-wrap rounded-xl border border-slate-200 bg-white px-3 py-2 font-serif text-base leading-relaxed text-slate-700 shadow-inner transition-all duration-300 placeholder:text-slate-300 focus:border-slate-300 focus:shadow-sm focus-visible:ring-2 focus-visible:ring-offset-0",
            )}
            style={{ "--tw-ring-color": ringColor } as CSSCustomProperties}
          />
          <div className="px-1">
            <span className={cn("text-xs tabular-nums", latex.length >= MAX_LATEX_LENGTH ? "font-semibold text-red-600" : "text-slate-400")}>
              {latex.length.toLocaleString()} / {MAX_LATEX_LENGTH.toLocaleString()}
            </span>
          </div>
          {latex.trim() ? <MathRenderer latex={latex} displayMode={data.displayMode ?? "block"} /> : null}
          {error ? (
            <p className="mt-1 text-xs font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { MathEditorDialog };
export type { MathEditorDialogProps };
