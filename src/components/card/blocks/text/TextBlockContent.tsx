import { BlockSurface } from "@/components/card/blocks/core/BlockSurface";
import {
  TEXT_BLOCK_CONTENT_CLASS,
  TEXT_BLOCK_LINE_HEIGHT_PX,
} from "@/components/card/blocks/text/textBlockStyles";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import {
  buildTypographyStyle,
  scaleTypographyNumberPx,
} from "@/components/card/common/cardViewZoom";

const normalizeTextBlockContent = (content: string) =>
  String(content ?? "").replace(/\r\n/g, "\n");

type TextBlockContentProps =
  | {
      mode: "view";
      content: string;
      zoom?: number;
    }
  | {
      mode: "edit";
      content: string;
      onChange: (content: string) => void;
      placeholder?: string;
      autoFocus?: boolean;
    };

export const TextBlockContent = (props: TextBlockContentProps) => {
  const normalizedContent = normalizeTextBlockContent(props.content);

  if (props.mode === "view") {
    const displayText =
      normalizedContent.length === 0 ? "\u00A0" : normalizedContent;

    const textStyle = buildTypographyStyle({
      fontSizePx: 16,
      lineHeightPx: TEXT_BLOCK_LINE_HEIGHT_PX,
      zoom: props.zoom,
    });

    return (
      <BlockSurface
        ruled={true}
        ruledRowPx={scaleTypographyNumberPx(TEXT_BLOCK_LINE_HEIGHT_PX, props.zoom)}
        className="flex-1"
      >
        <div
          className={`${TEXT_BLOCK_CONTENT_CLASS} whitespace-pre-wrap`}
          style={textStyle}
        >
          {displayText}
        </div>
      </BlockSurface>
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
};