"use client";
import { BaselineIcon, BoldIcon, Code2Icon, HighlighterIcon, ItalicIcon, PaintBucketIcon, StrikethroughIcon, UnderlineIcon, WandSparklesIcon } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";
import { AIToolbarButton } from "@/chip/ui/plate/ai-toolbar-button";
import { AlignToolbarButton } from "@/chip/ui/plate/align-toolbar-button";
import { CommentToolbarButton } from "@/chip/ui/plate/comment-toolbar-button";
import { EmojiToolbarButton } from "@/chip/ui/plate/emoji-toolbar-button";
import { FontColorToolbarButton } from "@/chip/ui/plate/font-color-toolbar-button";
import { RedoToolbarButton, UndoToolbarButton } from "@/chip/ui/plate/history-toolbar-button";
import { InsertToolbarButton } from "@/chip/ui/plate/insert-toolbar-classic-button";
import { LineHeightToolbarButton } from "@/chip/ui/plate/line-height-toolbar-button";
import { LinkToolbarButton } from "@/chip/ui/plate/link-toolbar-button";
import { IndentToolbarButton, ListToolbarButton } from "@/chip/ui/plate/list-classic-toolbar-button";
import { MarkToolbarButton } from "@/chip/ui/plate/mark-toolbar-button";
import { MediaToolbarButton } from "@/chip/ui/plate/media-toolbar-button";
import { ModeToolbarButton } from "@/chip/ui/plate/mode-toolbar-button";
import { MoreToolbarButton } from "@/chip/ui/plate/more-toolbar-button";
import { TableToolbarButton } from "@/chip/ui/plate/table-toolbar-button";
import { ToggleToolbarButton } from "@/chip/ui/plate/toggle-toolbar-button";
import { ToolbarGroup } from "@/chip/ui/plate/toolbar";
import { TurnIntoToolbarButton } from "@/chip/ui/plate/turn-into-toolbar-classic-button";

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
            <InsertToolbarButton />
            <TurnIntoToolbarButton />
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
            <ListToolbarButton nodeType={KEYS.ul} />
            <ListToolbarButton nodeType={KEYS.ol} />
            <ListToolbarButton nodeType={KEYS.listTodo} />
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
            <IndentToolbarButton reverse />
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
