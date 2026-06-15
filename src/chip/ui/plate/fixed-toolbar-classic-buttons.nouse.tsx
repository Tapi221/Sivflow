"use client";

import { BaselineIcon, BoldIcon, Code2Icon, HighlighterIcon, ItalicIcon, PaintBucketIcon, StrikethroughIcon, UnderlineIcon, WandSparklesIcon } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";
import { InsertToolbarButton } from "@/chip/ui/plate/insert-toolbar-classic-button";
import { IndentToolbarButton, ListToolbarButton } from "@/chip/ui/plate/list-classic-toolbar-button";
import { TurnIntoToolbarButton } from "@/chip/ui/plate/turn-into-toolbar-classic-button";
import { ButtonClickPanelNoteAi } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Ai";
import { AlignToolbarButton } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Align";
import { CommentToolbarButton } from "@/chip/ui/plate/comment-toolbar-button";
import { ButtonClickPanelNoteEmoji } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Emoji";
import { ButtonClickPanelNoteFontColor } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.FontColor";
import { RedoToolbarButton, UndoToolbarButton } from "@/chip/ui/plate/history-toolbar-button";
import { LineHeightToolbarButton } from "@/chip/ui/plate/line-height-toolbar-button";
import { LinkToolbarButton } from "@/chip/ui/plate/link-toolbar-button";
import { MarkToolbarButton } from "@/chip/ui/plate/mark-toolbar-button";
import { MediaToolbarButton } from "@/chip/button/Button.Note.Media";
import { ButtonClickPanelNoteMode } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Mode";
import { MoreToolbarButton } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.More";
import { ButtonClickPanelNoteTable } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Table";
import { ToggleToolbarButton } from "@/chip/button/Button.Note.Toggle";
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
            <ButtonClickPanelNoteAi tooltip="AI commands">
              <WandSparklesIcon />
            </ButtonClickPanelNoteAi>
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
            <ButtonClickPanelNoteFontColor nodeType={KEYS.color} tooltip="Text color">
              <BaselineIcon />
            </ButtonClickPanelNoteFontColor>
            <ButtonClickPanelNoteFontColor nodeType={KEYS.backgroundColor} tooltip="Background color">
              <PaintBucketIcon />
            </ButtonClickPanelNoteFontColor>
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
            <ButtonClickPanelNoteTable />
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
        <ButtonClickPanelNoteMode />
      </ToolbarGroup>
    </div>
  );
};

export { FixedToolbarButtons };
