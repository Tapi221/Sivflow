import { BlockSurface } from "@/components/card/blocks/core/BlockSurface";
import { buildTypographyStyle, mergeStyles, scaleTypographyNumberPx } from "@/components/card/common/cardSetViewZoom";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import { TYPOGRAPHY_FONT_SIZE_PX } from "@shared/design-tokens/typography";
import { TEXT_BLOCK_CONTENT_CLASS, TEXT_BLOCK_LINE_HEIGHT_PX } from "./textBlockStyles";

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

const RULED_TEXTAREA_BACKGROUND_IMAGE =
  "linear-gradient(to bottom, transparent calc(100% - var(--card-ruled-line-px, 1px)), var(--card-ruled-color, rgba(0,0,0,0.05)) calc(100% - var(--card-ruled-line-px, 1px)))";

const normalizeTextBlockContent = (content: string) =>
  String(content ?? "").replace(/\r\n/g, "\n");

const buildTextBlockPresentation = (zoom?: number) => {
  const textStyle = buildTypographyStyle({
    fontSizePx: TYPOGRAPHY_FONT_SIZE_PX.md,
    lineHeightPx: TEXT_BLOCK_LINE_HEIGHT_PX,
    zoom,
  });
  const ruledRowPx = scaleTypographyNumberPx(TEXT_BLOCK_LINE_HEIGHT_PX, zoom);

  return {
    textStyle,
    ruledRowPx,
    editorTextStyle: mergeStyles(textStyle, {
      backgroundImage: RULED_TEXTAREA_BACKGROUND_IMAGE,
      backgroundSize: `100% ${ruledRowPx}px`,
      backgroundPosition: "0 0",
      backgroundRepeat: "repeat-y",
      backgroundAttachment: "local",
    }),
  };
};

const TextBlockContent = (props: TextBlockContentProps) => {
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
      style={presentation.editorTextStyle}
      className={`${TEXT_BLOCK_CONTENT_CLASS} placeholder:text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0`}
    />
  );
};

export { TextBlockContent };