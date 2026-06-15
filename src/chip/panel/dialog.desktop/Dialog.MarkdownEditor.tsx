import type { ClipboardEvent, CSSProperties, FC, KeyboardEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/chip/panel/dialog.desktop/dialog/dialog";
import AutoResizeTextarea from "@/chip/ui/AutoResizeTextarea";
import { cn } from "@/lib/utils";



type CSSCustomProperties = CSSProperties & Record<`--${string}`, string>;
interface MarkdownEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (next: string) => void;
  onPasteCapture?: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  accentColor?: string;
  error?: string | null;
}



const EDITOR_LINE_HEIGHT = 24;
const EDITOR_MIN_ROWS = 10;
const EDITOR_MAX_HEIGHT = 520;



const isHexColor = (color: string) => /^#[0-9a-fA-F]{3,8}$/.test(color);



const MarkdownEditorDialog: FC<MarkdownEditorDialogProps> = ({ open, onOpenChange, value, onChange, onPasteCapture, onKeyDown, accentColor, error }) => {
  const ringColor = accentColor && isHexColor(accentColor) ? `${accentColor}40` : "var(--primary-color-alpha-40)";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,780px)] max-w-96 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-4 py-3">
          <DialogTitle className="font-serif text-xs font-medium tracking-widest text-slate-500 uppercase">
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
              "markdownBlockEditorTextarea w-full resize-none whitespace-pre-wrap rounded-xl border border-slate-200 bg-white px-3 py-2 font-serif text-base font-medium leading-6 text-slate-700 shadow-inner transition-all duration-300 placeholder:text-slate-300 focus:border-slate-300 focus:shadow-sm focus-visible:ring-2 focus-visible:ring-offset-0",
            )}
            style={{ "--tw-ring-color": ringColor } as CSSCustomProperties}
          />
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



export { MarkdownEditorDialog };


export type { MarkdownEditorDialogProps };
