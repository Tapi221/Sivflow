"use client";

import { ArrowUpToLineIcon, BaselineIcon, BoldIcon, Code2Icon, HighlighterIcon, ItalicIcon, PaintBucketIcon, StrikethroughIcon, UnderlineIcon, WandSparklesIcon } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";
import { ButtonNoteFontSize } from "@/chip/button/Button.Note.FontSize";
import { ButtonNoteIndent, ButtonNoteOutdent } from "@/chip/button/Button.Note.Indent";
import { ButtonNoteMedia } from "@/chip/button/Button.Note.Media";
import { ButtonNoteToggle } from "@/chip/button/Button.Note.Toggle";
import { ButtonClickPanelNoteAi } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Ai";
import { ButtonClickPanelNoteAlign } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Align";
import { ButtonClickPanelNoteEmoji } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Emoji";
import { ButtonClickPanelNoteExport } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Export";
import { ButtonClickPanelNoteFontColor } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.FontColor";
import { ButtonClickPanelNoteImport } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Import";
import { ButtonClickPanelNoteInsert } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Insert";
import { ButtonClickPanelNoteLineHeight } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.LineHeight";
import { ButtonClickPanelNoteBulletedList, ButtonClickPanelNoteNumberedList, ButtonClickPanelNoteTodoList } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.List";
import { ButtonClickPanelNoteMode } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Mode";
import { ButtonClickPanelNoteMore } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.More";
import { ButtonClickPanelNoteTable } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Table";
import { ButtonClickPanelNoteTurnInto } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.TurnInto";
import { CommentToolbarButton } from "@/chip/ui/plate/comment-toolbar-button";
import { RedoToolbarButton, UndoToolbarButton } from "@/chip/ui/plate/history-toolbar-button";
import { LinkToolbarButton } from "@/chip/ui/plate/link-toolbar-button";
import { MarkToolbarButton } from "@/chip/ui/plate/mark-toolbar-button";
import { ToolbarGroup } from "@/chip/ui/plate/toolbar";

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
            <ButtonClickPanelNoteImport />
          </ToolbarGroup>
          <ToolbarGroup>
            <ButtonClickPanelNoteInsert />
            <ButtonClickPanelNoteTurnInto />
            <ButtonNoteFontSize />
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
            <ButtonNoteToggle />
          </ToolbarGroup>
          <ToolbarGroup>
            <LinkToolbarButton />
            <ButtonClickPanelNoteTable />
            <ButtonClickPanelNoteEmoji />
          </ToolbarGroup>
          <ToolbarGroup>
            <ButtonNoteMedia nodeType={KEYS.img} />
            <ButtonNoteMedia nodeType={KEYS.video} />
            <ButtonNoteMedia nodeType={KEYS.audio} />
            <ButtonNoteMedia nodeType={KEYS.file} />
          </ToolbarGroup>
          <ToolbarGroup>
            <ButtonClickPanelNoteLineHeight />
            <ButtonNoteOutdent />
            <ButtonNoteIndent />
          </ToolbarGroup>
          <ToolbarGroup>
            <ButtonClickPanelNoteMore />
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
        <ButtonClickPanelNoteMode />
      </ToolbarGroup>
    </div>
  );
};

export { ToolbarNote };
