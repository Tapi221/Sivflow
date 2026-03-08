import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import { MathBlockContent } from "./MathBlockContent";
import { cn } from "@/lib/utils";
import type { MathBlockData } from "@/types";

type CSSCustomProperties = React.CSSProperties & Record<`--${string}`, string>;

const EDITOR_LINE_HEIGHT = 24;
const EDITOR_MIN_ROWS = 8;
const EDITOR_MAX_HEIGHT = 420;

const isHexColor = (color: string) => /^#[0-9a-fA-F]{3,8}$/.test(color);

interface MathEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: MathBlockData;
  onChange: (next: MathBlockData) => void;
  accentColor?: string;
  error?: string | null;
}

export const MathEditorDialog: React.FC<MathEditorDialogProps> = ({
  open,
  onOpenChange,
  data,
  onChange,
  accentColor,
  error,
}) => {
  const ringColor =
    accentColor && isHexColor(accentColor)
      ? `${accentColor}40`
      : "var(--primary-color-alpha-40)";

  const latex = data?.latex ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,780px)] max-w-[780px] p-0 overflow-hidden">
        <DialogHeader className="border-b border-slate-100 px-4 py-3">
          <DialogTitle className="font-serif text-[11px] font-medium tracking-[0.12em] uppercase text-slate-500">
            Math Editor
          </DialogTitle>
          <DialogDescription className="sr-only">
            数式を編集するダイアログ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-3 pt-3 pb-4">
          <AutoResizeTextarea
            value={latex}
            onChange={(event) =>
              onChange({ ...data, latex: event.target.value })
            }
            placeholder="例: x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}"
            aria-label="LaTeX入力"
            minRows={EDITOR_MIN_ROWS}
            lineHeight={EDITOR_LINE_HEIGHT}
            allowInternalScroll={true}
            maxHeight={EDITOR_MAX_HEIGHT}
            autoFocus
            textareaClassName="font-serif"
            className={cn(
              "w-full font-serif text-base leading-relaxed text-slate-700 placeholder:text-slate-300",
              "border border-slate-200 rounded-xl px-3 py-2 transition-all duration-300",
              "focus-visible:ring-2 focus-visible:ring-offset-0 bg-white focus:border-slate-300",
              "shadow-inner focus:shadow-sm resize-none whitespace-pre-wrap",
            )}
            style={{ "--tw-ring-color": ringColor } as CSSCustomProperties}
          />

          {latex.trim() && (
            <MathBlockContent
              latex={latex}
              displayMode={data.displayMode ?? "block"}
            />
          )}

          {error && (
            <p
              className="text-[10px] text-red-600 mt-1 font-medium"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};



