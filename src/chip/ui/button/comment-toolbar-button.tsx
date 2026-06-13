"use client";

import * as React from "react";
import { MessageSquareTextIcon } from "lucide-react";
import { useEditorRef } from "platejs/react";
import { ToolbarButton } from "@/chip/ui/toolbar";
import { commentPlugin } from "@/components/editor/plugins/comment-kit";

const CommentToolbarButton = () => {
  const editor = useEditorRef();

  return (
    <ToolbarButton
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
