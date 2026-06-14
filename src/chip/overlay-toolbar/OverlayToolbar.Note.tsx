"use client";

import { ArrowUpToLineIcon, BaselineIcon, BoldIcon, Code2Icon, HighlighterIcon, ItalicIcon, PaintBucketIcon, StrikethroughIcon, UnderlineIcon, WandSparklesIcon } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";
import { ButtonClickPanelNoteAi } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Ai";
import { ButtonClickPanelNoteInsert } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Insert";
import { ButtonClickPanelNoteAlign } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Align";
import { CommentToolbarButton } from "@/chip/ui/plate/comment-toolbar-button";
import { ButtonClickPanelNoteEmoji } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Emoji";
import { ButtonClickPanelNoteExport } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Export";
import { ButtonClickPanelNoteFontColor } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.FontColor";
import { FontSizeToolbarButton } from "@/chip/ui/plate/font-size-toolbar-button";
import { RedoToolbarButton, UndoToolbarButton } from "@/chip/ui/plate/history-toolbar-button";
import { ImportToolbarButton } from "@/chip/ui/plate/import-toolbar-button";
import { IndentToolbarButton, OutdentToolbarButton } from "@/chip/ui/plate/indent-toolbar-button";
import { LineHeightToolbarButton } from "@/chip/ui/plate/line-height-toolbar-button";
import { LinkToolbarButton } from "@/chip/ui/plate/link-toolbar-button";
import { ButtonClickPanelNoteBulletedList, ButtonClickPanelNoteNumberedList, ButtonClickPanelNoteTodoList } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.List";
import { MarkToolbarButton } from "@/chip/ui/plate/mark-toolbar-button";
import { MediaToolbarButton } from "@/chip/button/Button.Note.Media";
import { ModeToolbarButton } from "@/chip/ui/plate/mode-toolbar-button";
import { MoreToolbarButton } from "@/chip/ui/plate/more-toolbar-button";
import { TableToolbarButton } from "@/chip/ui/plate/table-toolbar-button";
import { ToggleToolbarButton } from "@/chip/button/Button.Note.Toggle";
import { ToolbarGroup } from "@/chip/ui/plate/toolbar";
import { TurnIntoToolbarButton } from "@/chip/ui/plate/turn-into-toolbar-button";

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
            <ButtonClickPanelNoteExport>
              <ArrowUpToLineIcon />
            </ButtonClickPanelNoteExport>
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
            <ButtonClickPanelNoteFontColor nodeType={KEYS.color} tooltip="Text color">
              <BaselineIcon />
            </ButtonClickPanelNoteFontColor>
            <ButtonClickPanelNoteFontColor nodeType={KEYS.backgroundColor} tooltip="Background color">
              <PaintBucketIcon />
            </ButtonClickPanelNoteFontColor>
          </ToolbarGroup>
          <ToolbarGroup>
            <ButtonClickPanelNoteAlign />
            <ButtonClickPanelNoteNumberedList />
            <ButtonClickPanelNoteBulletedList />
            <ButtonClickPanelNoteTodoList />
            <ToggleToolbarButton />
          </ToolbarGroup>
          <ToolbarGroup>
            <LinkToolbarButton />
            <TableToolbarButton />
            <ButtonClickPanelNoteEmoji />
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
