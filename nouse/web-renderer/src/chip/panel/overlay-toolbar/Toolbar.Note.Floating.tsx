"use client";

import { ButtonClickPanelNoteAi } from "@web-renderer/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Ai";

import { ButtonClickPanelNoteMore } from "@web-renderer/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.More";

import { ButtonClickPanelNoteTurnInto } from "@web-renderer/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.TurnInto";

import { CommentToolbarButton } from "@web-renderer/chip/ui/plate/comment-toolbar-button";

import { InlineEquationToolbarButton } from "@web-renderer/chip/ui/plate/equation-toolbar-button";

import { LinkToolbarButton } from "@web-renderer/chip/ui/plate/link-toolbar-button";

import { MarkToolbarButton } from "@web-renderer/chip/ui/plate/mark-toolbar-button";

import { SuggestionToolbarButton } from "@web-renderer/chip/ui/plate/suggestion-toolbar-button";

import { ToolbarGroup } from "@web-renderer/chip/ui/plate/toolbar";

import { BoldIcon, Code2Icon, ItalicIcon, StrikethroughIcon, UnderlineIcon } from "lucide-react";

import { KEYS } from "platejs";

import { useEditorReadOnly } from "platejs/react";



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
