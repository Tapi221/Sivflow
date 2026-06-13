"use client";

import * as React from "react";
import { BoldIcon, Code2Icon, ItalicIcon, StrikethroughIcon, UnderlineIcon, WandSparklesIcon } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";
import { AIToolbarButton } from "@/chip/ui/button/ai-toolbar-button";
import { CommentToolbarButton } from "@/chip/ui/button/comment-toolbar-button";
import { InlineEquationToolbarButton } from "@/chip/ui/button/equation-toolbar-button";
import { LinkToolbarButton } from "@/chip/ui/button/link-toolbar-button";
import { MarkToolbarButton } from "@/chip/ui/button/mark-toolbar-button";
import { MoreToolbarButton } from "@/chip/ui/button/more-toolbar-button";
import { SuggestionToolbarButton } from "@/chip/ui/button/suggestion-toolbar-button";
import { ToolbarGroup } from "@/chip/ui/toolbar";
import { TurnIntoToolbarButton } from "@/chip/ui/turn-into-toolbar-button";

const FloatingToolbarButtons = () => {
  const readOnly = useEditorReadOnly();

  return (
    <>
      {!readOnly && (
        <>
          <ToolbarGroup>
            <AIToolbarButton tooltip="AI commands">
              <WandSparklesIcon />
              Ask AI
            </AIToolbarButton>
          </ToolbarGroup>
          <ToolbarGroup>
            <TurnIntoToolbarButton />
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

        {!readOnly && <MoreToolbarButton />}
      </ToolbarGroup>
    </>
  );
};

export { FloatingToolbarButtons };
