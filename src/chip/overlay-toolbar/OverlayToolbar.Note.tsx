"use client";

import { ArrowUpToLineIcon, BaselineIcon, BoldIcon, Code2Icon, HighlighterIcon, ItalicIcon, PaintBucketIcon, StrikethroughIcon, UnderlineIcon, WandSparklesIcon } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";
import { ButtonClickPanelNoteAi } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Ai";
import { ButtonClickPanelNoteInsert } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Insert";
import { AlignToolbarButton } from "../ui/plate/align-toolbar-button";
import { CommentToolbarButton } from "../ui/plate/comment-toolbar-button";
import { EmojiToolbarButton } from "../ui/plate/emoji-toolbar-button";
import { ExportToolbarButton } from "../ui/plate/export-toolbar-button";
import { FontColorToolbarButton } from "../ui/plate/font-color-toolbar-button";
import { FontSizeToolbarButton } from "../ui/plate/font-size-toolbar-button";
import { RedoToolbarButton, UndoToolbarButton } from "../ui/plate/history-toolbar-button";
import { ImportToolbarButton } from "../ui/plate/import-toolbar-button";
import { IndentToolbarButton, OutdentToolbarButton } from "../ui/plate/indent-toolbar-button";
import { LineHeightToolbarButton } from "../ui/plate/line-height-toolbar-button";
import { LinkToolbarButton } from "../ui/plate/link-toolbar-button";
import { BulletedListToolbarButton, NumberedListToolbarButton, TodoListToolbarButton } from "../ui/plate/list-toolbar-button";
import { MarkToolbarButton } from "../ui/plate/mark-toolbar-button";
import { MediaToolbarButton } from "../ui/plate/media-toolbar-button";
import { ModeToolbarButton } from "../ui/plate/mode-toolbar-button";
import { MoreToolbarButton } from "../ui/plate/more-toolbar-button";
import { TableToolbarButton } from "../ui/plate/table-toolbar-button";
import { ToggleToolbarButton } from "../ui/plate/toggle-toolbar-button";
import { ToolbarGroup } from "../ui/plate/toolbar";
import { TurnIntoToolbarButton } from "../ui/plate/turn-into-toolbar-button";

const ToolbarNote = () => {
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
            <ButtonClickPanelNoteAi tooltip="AI commands">
              <WandSparklesIcon />
            </ButtonClickPanelNoteAi>
          </ToolbarGroup>
          <ToolbarGroup>
            <ExportToolbarButton>
              <ArrowUpToLineIcon />
            </ExportToolbarButton>
            <ImportToolbarButton />
          </ToolbarGroup>
          <ToolbarGroup>
            <ButtonClickPanelNoteInsert />
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
            <MarkToolbarButton nodeType={KEYS.underline} tooltip="Underline (⌘+U)">
              <UnderlineIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={KEYS.strikethrough} tooltip="Strikethrough (⌘+⇧+M)">
              <StrikethroughIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={KEYS.code} tooltip="Code (⌘+E)">
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

export { ToolbarNote };
