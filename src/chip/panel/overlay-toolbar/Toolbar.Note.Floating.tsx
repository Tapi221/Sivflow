"use client";

import { BoldIcon, Code2Icon, ItalicIcon, StrikethroughIcon, UnderlineIcon } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";
import { ButtonClickPanelNoteAi } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Ai";
import { ButtonClickPanelNoteMore } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.More";
import { ButtonClickPanelNoteTurnInto } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.TurnInto";
import { CommentToolbarButton } from "@/chip/ui/plate/comment-toolbar-button";
import { InlineEquationToolbarButton } from "@/chip/ui/plate/equation-toolbar-button";
import { LinkToolbarButton } from "@/chip/ui/plate/link-toolbar-button";
import { MarkToolbarButton } from "@/chip/ui/plate/mark-toolbar-button";
import { SuggestionToolbarButton } from "@/chip/ui/plate/suggestion-toolbar-button";
import { ToolbarGroup } from "@/chip/ui/plate/toolbar";

const FloatingToolbarButtons = () => {
  const readOnly = useEditorReadOnly();
  return (
    <>
      {!readOnly && (
        <>
          <ToolbarGroup>
            <ButtonClickPanelNoteAi />
          </ToolbarGroup>
          <ToolbarGroup>
            <ButtonClickPanelNoteTurnInto />
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
            <InlineEquationToolbarButton />
            <LinkToolbarButton />
          </ToolbarGroup>
        </>
      )}
      <ToolbarGroup>
        <CommentToolbarButton />
        <SuggestionToolbarButton />
        {!readOnly && <ButtonClickPanelNoteMore />}
      </ToolbarGroup>
    </>
  );
};

export { FloatingToolbarButtons };
