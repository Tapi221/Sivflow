"use client";

import { MessageSquareTextIcon } from "lucide-react";
import { useEditorRef } from "platejs/react";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";
import { commentPlugin } from "@/components/editor/plugins/comment-kit";

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
