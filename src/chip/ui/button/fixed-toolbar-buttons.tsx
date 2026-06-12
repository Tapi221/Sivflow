"use client";

import * as React from "react";
import { ArrowUpToLineIcon, BaselineIcon, BoldIcon, Code2Icon, HighlighterIcon, ItalicIcon, PaintBucketIcon, StrikethroughIcon, UnderlineIcon, WandSparklesIcon } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";
import { AIToolbarButton } from "@/chip/ui/button/ai-toolbar-button";
import { AlignToolbarButton } from "../align-toolbar-button";
import { CommentToolbarButton } from "@/chip/ui/button/comment-toolbar-button";
import { EmojiToolbarButton } from "@/chip/ui/button/emoji-toolbar-button";
import { ExportToolbarButton } from "@/chip/ui/button/export-toolbar-button";
import { FontColorToolbarButton } from "@/chip/ui/button/font-color-toolbar-button";
import { FontSizeToolbarButton } from "../font-size-toolbar-button";
import { RedoToolbarButton, UndoToolbarButton } from "@/chip/ui/button/history-toolbar-button";
import { ImportToolbarButton } from "@/chip/ui/button/import-toolbar-button";
import { IndentToolbarButton, OutdentToolbarButton } from "@/chip/ui/button/indent-toolbar-button";
import { InsertToolbarButton } from "@/chip/ui/button/insert-toolbar-button";
import { LineHeightToolbarButton } from "@/chip/ui/button/line-height-toolbar-button";
import { LinkToolbarButton } from "@/chip/ui/button/link-toolbar-button";
import { BulletedListToolbarButton, NumberedListToolbarButton, TodoListToolbarButton } from "@/chip/ui/button/list-toolbar-button";
import { MarkToolbarButton } from "@/chip/ui/button/mark-toolbar-button";
import { MediaToolbarButton } from "@/chip/ui/button/media-toolbar-button";
import { ModeToolbarButton } from "@/chip/ui/button/mode-toolbar-button";
import { MoreToolbarButton } from "@/chip/ui/button/more-toolbar-button";
import { TableToolbarButton } from "@/chip/dropdownchip/table-toolbar-button";
import { ToggleToolbarButton } from "@/chip/ui/button/toggle-toolbar-button";
import { ToolbarGroup } from "@/chip/ui/toolbar";
import { TurnIntoToolbarButton } from "@/chip/ui/turn-into-toolbar-button";

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
            <AIToolbarButton tooltip="AI commands">
              <WandSparklesIcon />
            </AIToolbarButton>
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
            <MarkToolbarButton nodeType={KEYS.bold} tooltip="Bold (⌘+B)">
              <BoldIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={KEYS.italic} tooltip="Italic (⌘+I)">
              <ItalicIcon />
            </MarkToolbarButton>
            <MarkToolbarButton
              nodeType={KEYS.underline}
              tooltip="Underline (⌘+U)"
            >
              <UnderlineIcon />
            </MarkToolbarButton>
            <MarkToolbarButton
              nodeType={KEYS.strikethrough}
              tooltip="Strikethrough (⌘+⇧+M)"
            >
              <StrikethroughIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={KEYS.code} tooltip="Code (⌘+E)">
              <Code2Icon />
            </MarkToolbarButton>
            <FontColorToolbarButton nodeType={KEYS.color} tooltip="Text color">
              <BaselineIcon />
            </FontColorToolbarButton>
            <FontColorToolbarButton
              nodeType={KEYS.backgroundColor}
              tooltip="Background color"
            >
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
            <OutdentToolbarButton />
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
