"use client";

import * as React from "react";
import { ArrowUpIcon } from "lucide-react";
import type { Value } from "platejs";
import { Plate } from "platejs/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/chip/ui/avatar";
import { Button } from "@/chip/ui/button/button";
import { Editor, EditorContainer } from "@/chip/ui/plate/editor";
import { cn } from "@/lib/utils";

type ButtonClickPanelNoteCommentUser = {
  avatarUrl?: string;
  name?: string;
};
type ButtonClickPanelNoteCommentProps = {
  autoFocus?: boolean;
  className?: string;
  commentContent: string;
  commentEditor: React.ComponentProps<typeof Plate>["editor"];
  userInfo?: ButtonClickPanelNoteCommentUser;
  onAddComment: () => Promise<void> | void;
  onCommentValueChange: (value: Value) => void;
};

const ButtonClickPanelNoteComment = ({
  autoFocus = false,
  className,
  commentContent,
  commentEditor,
  userInfo,
  onAddComment,
  onCommentValueChange,
}: ButtonClickPanelNoteCommentProps) => (
  <div className={cn("flex w-full", className)}>
    <div className="mt-2 mr-1 shrink-0">
      <Avatar className="size-5">
        <AvatarImage alt={userInfo?.name} src={userInfo?.avatarUrl} />
        <AvatarFallback>{userInfo?.name?.[0]}</AvatarFallback>
      </Avatar>
    </div>
    <div className="relative flex grow gap-2">
      <Plate
        onChange={({ value }) => {
          onCommentValueChange(value);
        }}
        editor={commentEditor}
      >
        <EditorContainer variant="comment">
          <Editor
            variant="comment"
            className="min-h-6 grow pt-0.5 pr-8"
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) {
                return;
              }
              event.preventDefault();
              void onAddComment();
            }}
            placeholder="Reply..."
            autoComplete="off"
            autoFocus={autoFocus}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-0.5 bottom-0.5 ml-auto size-6 shrink-0"
            disabled={commentContent.trim().length === 0}
            onClick={(event) => {
              event.stopPropagation();
              void onAddComment();
            }}
          >
            <div className="flex size-6 items-center justify-center rounded-full">
              <ArrowUpIcon />
            </div>
          </Button>
        </EditorContainer>
      </Plate>
    </div>
  </div>
);

export { ButtonClickPanelNoteComment };
export type { ButtonClickPanelNoteCommentProps, ButtonClickPanelNoteCommentUser };
