import { BaseAlignKit } from "@web-renderer/components/editor/plugins/align-base-kit";
import { BaseBasicBlocksKit } from "@web-renderer/components/editor/plugins/basic-blocks-base-kit";
import { BaseBasicMarksKit } from "@web-renderer/components/editor/plugins/basic-marks-base-kit";
import { BaseCalloutKit } from "@web-renderer/components/editor/plugins/callout-base-kit";
import { BaseCodeBlockKit } from "@web-renderer/components/editor/plugins/code-block-base-kit";
import { BaseCodeDrawingKit } from "@web-renderer/components/editor/plugins/code-drawing-base-kit";
import { BaseColumnKit } from "@web-renderer/components/editor/plugins/column-base-kit";
import { BaseCommentKit } from "@web-renderer/components/editor/plugins/comment-base-kit";
import { BaseDateKit } from "@web-renderer/components/editor/plugins/date-base-kit";
import { BaseExcalidrawKit } from "@web-renderer/components/editor/plugins/excalidraw-base-kit";
import { BaseFontKit } from "@web-renderer/components/editor/plugins/font-base-kit";
import { BaseFootnoteKit } from "@web-renderer/components/editor/plugins/footnote-base-kit";
import { BaseLineHeightKit } from "@web-renderer/components/editor/plugins/line-height-base-kit";
import { BaseLinkKit } from "@web-renderer/components/editor/plugins/link-base-kit";
import { BaseListKit } from "@web-renderer/components/editor/plugins/list-base-kit";
import { MarkdownKit } from "@web-renderer/components/editor/plugins/markdown-kit";
import { BaseMathKit } from "@web-renderer/components/editor/plugins/math-base-kit";
import { BaseMediaKit } from "@web-renderer/components/editor/plugins/media-base-kit";
import { BaseMentionKit } from "@web-renderer/components/editor/plugins/mention-base-kit";
import { BaseSuggestionKit } from "@web-renderer/components/editor/plugins/suggestion-base-kit";
import { BaseTableKit } from "@web-renderer/components/editor/plugins/table-base-kit";
import { BaseTocKit } from "@web-renderer/components/editor/plugins/toc-base-kit";
import { BaseToggleKit } from "@web-renderer/components/editor/plugins/toggle-base-kit";



const BaseEditorKit = [
  ...BaseBasicBlocksKit,
  ...BaseCodeBlockKit,
  ...BaseCodeDrawingKit,
  ...BaseExcalidrawKit,
  ...BaseTableKit,
  ...BaseToggleKit,
  ...BaseTocKit,
  ...BaseMediaKit,
  ...BaseCalloutKit,
  ...BaseColumnKit,
  ...BaseMathKit,
  ...BaseDateKit,
  ...BaseLinkKit,
  ...BaseMentionKit,
  ...BaseBasicMarksKit,
  ...BaseFontKit,
  ...BaseListKit,
  ...BaseAlignKit,
  ...BaseLineHeightKit,
  ...BaseCommentKit,
  ...BaseSuggestionKit,
  ...MarkdownKit,
  ...BaseFootnoteKit,
];



export { BaseEditorKit };
