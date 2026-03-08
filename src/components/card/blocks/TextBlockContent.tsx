import React from "react";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import {
  TEXT_BLOCK_CONTENT_CLASS,
  TEXT_BLOCK_LINE_HEIGHT_PX,
} from "./textBlockStyles";

const normalizeTextBlockContent = (content: string) =>
  String(content ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n+$/g, "");

type TextBlockContentProps =
  | {
      mode: "view";
      content: string;
    }
  | {
      mode: "edit";
      content: string;
      onChange: (content: string) => void;
      placeholder?: string;
      autoFocus?: boolean;
    };

export function TextBlockContent(props: TextBlockContentProps) {
  const normalizedContent = normalizeTextBlockContent(props.content);

  if (props.mode === "view") {
    const displayText =
      normalizedContent.length === 0 ? "\u00A0" : normalizedContent;

    return (
      <div className="w-full max-w-full overflow-hidden">
        <div className={`${TEXT_BLOCK_CONTENT_CLASS} whitespace-pre-wrap`}>
          {displayText}
        </div>
      </div>
    );
  }

  return (
    <AutoResizeTextarea
      value={normalizedContent}
      onChange={(e) =>
        props.onChange(normalizeTextBlockContent(e.target.value))
      }
      placeholder={props.placeholder || "テキストを入力..."}
      minRows={1}
      lineHeight={TEXT_BLOCK_LINE_HEIGHT_PX}
      allowInternalScroll={false}
      autoFocus={props.autoFocus}
      className={`${TEXT_BLOCK_CONTENT_CLASS} placeholder:text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0`}
    />
  );
}



