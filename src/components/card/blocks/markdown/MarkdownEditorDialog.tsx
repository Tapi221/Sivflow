import React from "react";

import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";

type CSSCustomProperties = React.CSSProperties & Record<`--${string}`, string>;

const EDITOR_LINE_HEIGHT = 24;
const EDITOR_MIN_ROWS = 10;
const EDITOR_MAX_HEIGHT = 520;

const isHexColor = (color: string) => /^#[0-9a-fA-F]{3,8}$/.test(color);

interface MarkdownEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (next: string) => void;
  onPasteCapture?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  accentColor?: string;
  error?: string | null;
}

export const MarkdownEditorDialog: React.FC<MarkdownEditorDialogProps> = ({
  open,
  onOpenChange,
  value,
  onChange,
  onPasteCapture,
  onKeyDown,
  accentColor,
  error,
}) => {
  const ringColor =
    accentColor && isHexColor(accentColor)
      ? `${accentColor}40`
      : "var(--primary-color-alpha-40)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,780px)] max-w-[780px] p-0 overflow-hidden">
        <DialogHeader className="border-b border-slate-100 px-4 py-3">
          <DialogTitle className="font-serif text-[11px] font-medium tracking-[0.12em] uppercase text-slate-500">
            Markdown Editor
          </DialogTitle>
          <DialogDescription className="sr-only">
            Markdownを編集するダイアログ
          </DialogDescription>
        </DialogHeader>

        <div className="markdownBlockEditor px-3 pt-3 pb-4">
          <AutoResizeTextarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onPasteCapture={onPasteCapture}
            onKeyDown={onKeyDown}
            placeholder="Markdownを入力..."
            aria-label="Markdown入力"
            minRows={EDITOR_MIN_ROWS}
            lineHeight={EDITOR_LINE_HEIGHT}
            allowInternalScroll={true}
            maxHeight={EDITOR_MAX_HEIGHT}
            autoFocus
            textareaClassName="font-serif"
            className={cn(
              "w-full font-serif text-base font-medium leading-[24px] text-slate-700 placeholder:text-slate-300",
              "border border-slate-200 rounded-xl px-3 py-2 transition-all duration-300",
              "focus-visible:ring-2 focus-visible:ring-offset-0 bg-white focus:border-slate-300",
              "shadow-inner focus:shadow-sm resize-none whitespace-pre-wrap",
            )}
            style={{ "--tw-ring-color": ringColor } as CSSCustomProperties}
          />

          {error ? (
            <p
              className="text-[10px] text-red-600 mt-1 font-medium"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
