"use client";

import { BoldIcon, Code2Icon, HighlighterIcon, ItalicIcon, LinkIcon, ListIcon, ListOrderedIcon, MessageSquareIcon, OutdentIcon, TextIcon, UnderlineIcon } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";
import { AiToolbarButton } from "@/chip/ui/plate/ai-toolbar-button";
import { CommentToolbarButton } from "@/chip/ui/plate/comment-toolbar-button";
import { RedoToolbarButton, UndoToolbarButton } from "@/chip/ui/plate/history-toolbar-button";
import { IndentToolbarButton } from "@/chip/ui/plate/indent-toolbar-button";
import { LinkToolbarButton } from "@/chip/ui/plate/link-toolbar-button";
import { BulletedListToolbarButton, NumberedListToolbarButton } from "@/chip/ui/plate/list-toolbar-button";
import { MarkToolbarButton } from "@/chip/ui/plate/mark-toolbar-button";
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
            <AiToolbarButton>
              <TextIcon />
            </AiToolbarButton>
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
            <MarkToolbarButton nodeType={KEYS.code} tooltip="Code">
              <Code2Icon />
            </MarkToolbarButton>
          </ToolbarGroup>
          <ToolbarGroup>
            <NumberedListToolbarButton>
              <ListOrderedIcon />
            </NumberedListToolbarButton>
            <BulletedListToolbarButton>
              <ListIcon />
            </BulletedListToolbarButton>
            <IndentToolbarButton reverse>
              <OutdentIcon />
            </IndentToolbarButton>
          </ToolbarGroup>
          <ToolbarGroup>
            <LinkToolbarButton>
              <LinkIcon />
            </LinkToolbarButton>
          </ToolbarGroup>
        </>
      )}
      <div className="grow" />
      <ToolbarGroup>
        <MarkToolbarButton nodeType={KEYS.highlight} tooltip="Highlight">
          <HighlighterIcon />
        </MarkToolbarButton>
        <CommentToolbarButton>
          <MessageSquareIcon />
        </CommentToolbarButton>
      </ToolbarGroup>
    </div>
  );
};

export { FixedToolbarButtons };
