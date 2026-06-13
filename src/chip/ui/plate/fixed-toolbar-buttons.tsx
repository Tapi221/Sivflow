"use client";

import { ArrowUpToLineIcon, BaselineIcon, BoldIcon, Code2Icon, HighlighterIcon, ItalicIcon, PaintBucketIcon, StrikethroughIcon, UnderlineIcon, WandSparklesIcon } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";
import { TableToolbarButton } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Table";
import { AlignToolbarButton } from "@/chip/ui/button/align-toolbar-button";
import { EmojiToolbarButton } from "@/chip/ui/button/emoji-toolbar-button";
import { ExportToolbarButton } from "@/chip/ui/button/export-toolbar-button";
import { FontColorToolbarButton } from "@/chip/ui/button/font-color-toolbar-button";
import { FontSizeToolbarButton } from "@/chip/ui/button/font-size-toolbar-button";
import { ImportToolbarButton } from "@/chip/ui/button/import-toolbar-button";
import { InsertToolbarButton } from "@/chip/ui/button/insert-toolbar-button";
import { LineHeightToolbarButton } from "@/chip/ui/button/line-height-toolbar-button";
import { MediaToolbarButton } from "@/chip/ui/button/media-toolbar-button";
import { ModeToolbarButton } from "@/chip/ui/button/mode-toolbar-button";
import { MoreToolbarButton } from "@/chip/ui/button/more-toolbar-button";
import { ToggleToolbarButton } from "@/chip/ui/button/toggle-toolbar-button";
import { TurnIntoToolbarButton } from "@/chip/ui/turn-into-toolbar-button";
import { AiToolbarButton } from "@/chip/ui/plate/ai-toolbar-button";
import { CommentToolbarButton } from "@/chip/ui/plate/comment-toolbar-button";
import { RedoToolbarButton, UndoToolbarButton } from "@/chip/ui/plate/history-toolbar-button";
import { IndentToolbarButton } from "@/chip/ui/plate/indent-toolbar-button";
import { LinkToolbarButton } from "@/chip/ui/plate/link-toolbar-button";
import { BulletedListToolbarButton, NumberedListToolbarButton, TodoListToolbarButton } from "@/chip/ui/plate/list-toolbar-button";
import { MarkToolbarButton } from "@/chip/ui/plate/mark-toolbar-button";
import { ToolbarGroup } from "@/chip/ui/plate/toolbar";

const FixedToolbarButtons = () => {
  const readOnly = useEditorReadOnly();
  return (
    <div className="flex w-full">
      {!readOnly && (
        <>
          <ToolbarGroup>
            <UndoToolbarButton />
            <RedoToolbarButton />
          </ToolbarGroup>
          <ToolbarGroup>
            <AiToolbarButton tooltip="AI commands">
              <WandSparklesIcon />
            </AiToolbarButton>
          </ToolbarGroup>
          <ToolbarGroup>
            <ExportToolbarButton>
              <ArrowUpToLineIcon />
            </ExportToolbarButton>
            <ImportToolbarButton />
          </ToolbarGroup>
          <ToolbarGroup>
            <InsertToolbarButton />
            <TurnIntoToolbarButton />
            <FontSizeToolbarButton />
          </ToolbarGroup>
          <ToolbarGroup>
            <MarkToolbarButton nodeType={KEYS.bold} tooltip="Bold">
              <BoldIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={KEYS.italic} tooltip="Italic">
              <ItalicIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={KEYS.underline} tooltip="Underline">
              <UnderlineIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={KEYS.strikethrough} tooltip="Strikethrough">
              <StrikethroughIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={KEYS.code} tooltip="Code">
              <Code2Icon />
            </MarkToolbarButton>
            <FontColorToolbarButton nodeType={KEYS.color} tooltip="Text color">
              <BaselineIcon />
            </FontColorToolbarButton>
            <FontColorToolbarButton nodeType={KEYS.backgroundColor} tooltip="Background color">
              <PaintBucketIcon />
            </FontColorToolbarButton>
          </ToolbarGroup>
          <ToolbarGroup>
            <AlignToolbarButton />
            <NumberedListToolbarButton />
            <BulletedListToolbarButton />
            <TodoListToolbarButton />
            <ToggleToolbarButton />
          </ToolbarGroup>
          <ToolbarGroup>
            <LinkToolbarButton />
            <TableToolbarButton />
            <EmojiToolbarButton />
          </ToolbarGroup>
          <ToolbarGroup>
            <MediaToolbarButton nodeType={KEYS.img} />
            <MediaToolbarButton nodeType={KEYS.video} />
            <MediaToolbarButton nodeType={KEYS.audio} />
            <MediaToolbarButton nodeType={KEYS.file} />
          </ToolbarGroup>
          <ToolbarGroup>
            <LineHeightToolbarButton />
            <IndentToolbarButton reverse>
            </IndentToolbarButton>
            <IndentToolbarButton />
          </ToolbarGroup>
          <ToolbarGroup>
            <MoreToolbarButton />
          </ToolbarGroup>
        </>
      )}
      <div className="grow" />
      <ToolbarGroup>
        <MarkToolbarButton nodeType={KEYS.highlight} tooltip="Highlight">
          <HighlighterIcon />
        </MarkToolbarButton>
        <CommentToolbarButton />
      </ToolbarGroup>
      <ToolbarGroup>
        <ModeToolbarButton />
      </ToolbarGroup>
    </div>
  );
};

export { FixedToolbarButtons };
