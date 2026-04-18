import { BlockSurface } from "@/components/card/blocks/core/BlockSurface";
import {
  TEXT_BLOCK_CONTENT_CLASS,
  TEXT_BLOCK_LINE_HEIGHT_PX,
} from "@/components/card/blocks/text/textBlockStyles";
import {
  buildTypographyStyle,
  scaleTypographyNumberPx,
} from "@/components/card/common/cardSetViewZoom";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";

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
      zoom?: number;
    };

const buildTextBlockPresentation = (zoom?: number) => ({
  textStyle: buildTypographyStyle({
    fontSizePx: 16,
    lineHeightPx: TEXT_BLOCK_LINE_HEIGHT_PX,
    zoom,
  }),
  ruledRowPx: scaleTypographyNumberPx(TEXT_BLOCK_LINE_HEIGHT_PX, zoom),
});

export const TextBlockContent = (props: TextBlockContentProps) => {
  const normalizedContent = normalizeTextBlockContent(props.content);
  const presentation = buildTextBlockPresentation(props.zoom);

  if (props.mode === "view") {
    const displayText =
      normalizedContent.length === 0 ? "\u00A0" : normalizedContent;

    return (
      <BlockSurface
        ruled={true}
        ruledRowPx={presentation.ruledRowPx}
        className="flex-1"
      >
        <div
          className={`${TEXT_BLOCK_CONTENT_CLASS} whitespace-pre-wrap`}
          style={presentation.textStyle}
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
      lineHeight={presentation.ruledRowPx}
      allowInternalScroll={false}
      autoFocus={props.autoFocus}
      style={presentation.textStyle}
      className={`${TEXT_BLOCK_CONTENT_CLASS} placeholder:text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0`}
    />
  );
};
