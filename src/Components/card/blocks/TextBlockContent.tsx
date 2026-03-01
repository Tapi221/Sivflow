import React from 'react';
import AutoResizeTextarea from '@/components/ui/AutoResizeTextarea';
import { TEXT_BLOCK_CONTENT_CLASS, TEXT_BLOCK_LINE_HEIGHT_PX } from './textBlockStyles';

const TEXT_BASELINE_NUDGE_PX = 2;

type TextBlockContentProps =
  | {
      mode: 'view';
      content: string;
    }
  | {
      mode: 'edit';
      content: string;
      onChange: (content: string) => void;
      placeholder?: string;
      autoFocus?: boolean;
    };

export function TextBlockContent(props: TextBlockContentProps) {
  if (props.mode === 'view') {
    const normalized = String(props.content ?? '').replace(/\r\n/g, '\n');
    let displayText = normalized.length === 0 ? '\u00A0' : normalized;
    if (displayText.endsWith('\n')) displayText += '\u00A0';

    return (
      <div className="w-full max-w-full overflow-hidden">
        <div
          className={`${TEXT_BLOCK_CONTENT_CLASS} whitespace-pre-wrap`}
          style={{ transform: `translateY(${TEXT_BASELINE_NUDGE_PX}px)` }}
        >
          {displayText}
        </div>
      </div>
    );
  }

  return (
    <AutoResizeTextarea
      value={props.content}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder || 'テキストを入力...'}
      minRows={1}
      lineHeight={TEXT_BLOCK_LINE_HEIGHT_PX}
      allowInternalScroll={false}
      autoFocus={props.autoFocus}
      className={`${TEXT_BLOCK_CONTENT_CLASS} placeholder:text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0`}
      style={{ transform: `translateY(${TEXT_BASELINE_NUDGE_PX}px)` }}
    />
  );
}
