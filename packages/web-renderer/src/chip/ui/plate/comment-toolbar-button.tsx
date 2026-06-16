"use client";

import type { ToolbarButtonProps } from "./toolbar";

import { ToolbarButton } from "./toolbar";

import { commentPlugin } from "@web-renderer/components/editor/plugins/comment-kit";

import { MessageSquareTextIcon } from "lucide-react";

import { useEditorRef } from "platejs/react";



const CommentToolbarButton = (props: ToolbarButtonProps) => {
  const editor = useEditorRef();
  return (
    <ToolbarButton
      {...props}
      onClick={() => {
        editor.getTransforms(commentPlugin).comment.setDraft();
      }}
      data-plate-prevent-overlay
      tooltip="Comment"
    >
      <MessageSquareTextIcon />
    </ToolbarButton>
  );
};



export { CommentToolbarButton };
