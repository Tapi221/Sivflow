import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import AutoResizeTextarea from '@/Components/ui/AutoResizeTextarea';
import { cn } from '@/lib/utils';

interface MarkdownEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (next: string) => void;
  onPasteCapture?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  accentColor?: string;
  error?: string | null;
}

export const MarkdownEditorDialog: React.FC<MarkdownEditorDialogProps> = ({
  open,
  onOpenChange,
  value,
  onChange,
  onPasteCapture,
  accentColor,
  error,
}) => {
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
            placeholder="Markdownを入力..."
            aria-label="Markdown入力"
            minRows={10}
            lineHeight={24}
            allowInternalScroll={true}
            maxHeight={520}
            autoFocus
            textareaClassName="font-serif"
            className={cn(
              'w-full font-serif text-base font-medium leading-[24px] text-slate-700 placeholder:text-slate-300',
              'border border-slate-200 rounded-xl px-3 py-2 transition-all duration-300',
              'focus-visible:ring-2 focus-visible:ring-offset-0 bg-white focus:border-slate-300',
              'shadow-inner focus:shadow-sm resize-none whitespace-pre-wrap'
            )}
            style={{
              '--tw-ring-color': accentColor
                ? `${accentColor}40`
                : 'var(--primary-color-alpha-40)',
            } as React.CSSProperties}
          />

          {error && (
            <p className="text-[10px] text-red-600 mt-1 font-medium">
              ⚠️ {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
