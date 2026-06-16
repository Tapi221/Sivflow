"use client";

import { AIKit } from "@web-renderer/components/editor/plugins/ai-kit";

import { AlignKit } from "@web-renderer/components/editor/plugins/align-kit";

import { AutoformatKit } from "@web-renderer/components/editor/plugins/autoformat-kit";

import { BasicBlocksKit } from "@web-renderer/components/editor/plugins/basic-blocks-kit";

import { BasicMarksKit } from "@web-renderer/components/editor/plugins/basic-marks-kit";

import { BlockMenuKit } from "@web-renderer/components/editor/plugins/block-menu-kit";

import { BlockPlaceholderKit } from "@web-renderer/components/editor/plugins/block-placeholder-kit";

import { BlockSelectionKit } from "@web-renderer/components/editor/plugins/block-selection-kit";

import { CalloutKit } from "@web-renderer/components/editor/plugins/callout-kit";

import { CodeBlockKit } from "@web-renderer/components/editor/plugins/code-block-kit";

import { CodeDrawingKit } from "@web-renderer/components/editor/plugins/code-drawing-kit";

import { ColumnKit } from "@web-renderer/components/editor/plugins/column-kit";

import { CommentKit } from "@web-renderer/components/editor/plugins/comment-kit";

import { CopilotKit } from "@web-renderer/components/editor/plugins/copilot-kit";

import { CursorOverlayKit } from "@web-renderer/components/editor/plugins/cursor-overlay-kit";

import { DateKit } from "@web-renderer/components/editor/plugins/date-kit";

import { DiscussionKit } from "@web-renderer/components/editor/plugins/discussion-kit";

import { DndKit } from "@web-renderer/components/editor/plugins/dnd-kit";

import { DocxKit } from "@web-renderer/components/editor/plugins/docx-kit";

import { EmojiKit } from "@web-renderer/components/editor/plugins/emoji-kit";

import { ExcalidrawKit } from "@web-renderer/components/editor/plugins/excalidraw-kit";

import { ExitBreakKit } from "@web-renderer/components/editor/plugins/exit-break-kit";

import { FixedToolbarKit } from "@web-renderer/components/editor/plugins/fixed-toolbar-kit";

import { FloatingToolbarKit } from "@web-renderer/components/editor/plugins/floating-toolbar-kit";

import { FontKit } from "@web-renderer/components/editor/plugins/font-kit";

import { FootnoteKit } from "@web-renderer/components/editor/plugins/footnote-kit";

import { LineHeightKit } from "@web-renderer/components/editor/plugins/line-height-kit";

import { LinkKit } from "@web-renderer/components/editor/plugins/link-kit";

import { ListKit } from "@web-renderer/components/editor/plugins/list-kit";

import { MarkdownKit } from "@web-renderer/components/editor/plugins/markdown-kit";

import { MathKit } from "@web-renderer/components/editor/plugins/math-kit";

import { MediaKit } from "@web-renderer/components/editor/plugins/media-kit";

import { MentionKit } from "@web-renderer/components/editor/plugins/mention-kit";

import { SlashKit } from "@web-renderer/components/editor/plugins/slash-kit";

import { SuggestionKit } from "@web-renderer/components/editor/plugins/suggestion-kit";

import { TableKit } from "@web-renderer/components/editor/plugins/table-kit";

import { TocKit } from "@web-renderer/components/editor/plugins/toc-kit";

import { ToggleKit } from "@web-renderer/components/editor/plugins/toggle-kit";

import type { Value } from "platejs";

import { TrailingBlockPlugin } from "platejs";

import type { TPlateEditor } from "platejs/react";

import { useEditorRef } from "platejs/react";



const EditorKit = [
  ...CopilotKit,
  ...AIKit,
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...CodeDrawingKit,
  ...ExcalidrawKit,
  ...TableKit,
  ...ToggleKit,
  ...TocKit,
  ...MediaKit,
  ...CalloutKit,
  ...ColumnKit,
  ...MathKit,
  ...DateKit,
  ...LinkKit,
  ...MentionKit,
  ...BasicMarksKit,
  ...FontKit,
  ...FootnoteKit,
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,
  ...DiscussionKit,
  ...CommentKit,
  ...SuggestionKit,
  ...SlashKit,
  ...AutoformatKit,
  ...CursorOverlayKit,
  ...BlockSelectionKit,
  ...BlockMenuKit,
  ...DndKit,
  ...EmojiKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,
  ...DocxKit,
  ...MarkdownKit,
  ...BlockPlaceholderKit,
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
];



type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>;



const useEditor = () => useEditorRef<MyEditor>();



export { EditorKit, useEditor };



export type { MyEditor };
