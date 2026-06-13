"use client";
import { BoldIcon, Code2Icon, ItalicIcon, StrikethroughIcon, UnderlineIcon, WandSparklesIcon } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";
import { AIToolbarButton } from "@/chip/ui/plate/ai-toolbar-button";
import { CommentToolbarButton } from "@/chip/ui/plate/comment-toolbar-button";
import { InlineEquationToolbarButton } from "@/chip/ui/plate/equation-toolbar-button";
import { LinkToolbarButton } from "@/chip/ui/plate/link-toolbar-button";
import { MarkToolbarButton } from "@/chip/ui/plate/mark-toolbar-button";
import { MoreToolbarButton } from "@/chip/ui/plate/more-toolbar-button";
import { SuggestionToolbarButton } from "@/chip/ui/plate/suggestion-toolbar-button";
import { ToolbarGroup } from "@/chip/ui/plate/toolbar";
import { TurnIntoToolbarButton } from "@/chip/ui/plate/turn-into-toolbar-button";

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
