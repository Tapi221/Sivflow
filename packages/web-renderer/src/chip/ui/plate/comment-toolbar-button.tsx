"use client";

import type { ToolbarButtonProps } from "@web-renderer/chip/ui/plate/toolbar";
import { ToolbarButton } from "@web-renderer/chip/ui/plate/toolbar";
import { MessageSquareTextIcon } from "lucide-react";
import { useEditorRef } from "platejs/react";
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
