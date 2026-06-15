"use client";

import * as React from "react";
import { MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useEditorRef } from "platejs/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/chip/panel/dropdown-menu";
import { Button } from "@/chip/ui/button/button";
import { discussionPlugin } from "@/components/editor/plugins/discussion-kit";
import { cn } from "@/lib/utils";

type CommentMoreDropdownComment = {
  id: string;
  discussionId: string;
};
type CommentMoreDropdownProps = {
  comment: CommentMoreDropdownComment;
  dropdownOpen: boolean;
  setDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  onCloseAutoFocus?: () => void;
  onRemoveComment?: () => void;
};

const CommentMoreDropdown = ({
  comment,
  dropdownOpen,
  setDropdownOpen,
  setEditingId,
  onCloseAutoFocus,
  onRemoveComment,
}: CommentMoreDropdownProps) => {
  const editor = useEditorRef();
  const selectedEditCommentRef = React.useRef<boolean>(false);
  const onDeleteComment = React.useCallback(() => {
    if (!comment.id) {
      window.alert("You are operating too quickly, please try again later.");
      return;
    }
    const updatedDiscussions = editor
      .getOption(discussionPlugin, "discussions")
      .map((discussion) => {
        if (discussion.id !== comment.discussionId) {
          return discussion;
        }
        const commentIndex = discussion.comments.findIndex(
          (currentComment) => currentComment.id === comment.id,
        );
        if (commentIndex === -1) {
          return discussion;
        }
        return {
          ...discussion,
          comments: [
            ...discussion.comments.slice(0, commentIndex),
            ...discussion.comments.slice(commentIndex + 1),
          ],
        };
      });
    editor.setOption(discussionPlugin, "discussions", updatedDiscussions);
    onRemoveComment?.();
  }, [comment.discussionId, comment.id, editor, onRemoveComment]);
  const onEditComment = React.useCallback(() => {
    selectedEditCommentRef.current = true;
    if (!comment.id) {
      window.alert("You are operating too quickly, please try again later.");
      return;
    }
    setEditingId(comment.id);
  }, [comment.id, setEditingId]);
  return (
    <DropdownMenu
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
      modal={false}
    >
      <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
        <Button variant="ghost" className={cn("h-6 p-1 text-muted-foreground")}>
          <MoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48"
        onCloseAutoFocus={(event) => {
          if (selectedEditCommentRef.current) {
            onCloseAutoFocus?.();
            selectedEditCommentRef.current = false;
          }
          return event.preventDefault();
        }}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onEditComment}>
            <PencilIcon className="size-4" />
            Edit comment
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDeleteComment}>
            <TrashIcon className="size-4" />
            Delete comment
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { CommentMoreDropdown };
export type { CommentMoreDropdownComment, CommentMoreDropdownProps };
