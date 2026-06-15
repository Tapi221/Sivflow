"use client";

import * as React from "react";

import { getCommentKey, getDraftCommentKey } from "@platejs/comment";

import { CommentPlugin, useCommentId } from "@platejs/comment/react";

import { differenceInDays, differenceInHours, differenceInMinutes, format } from "date-fns";

import { CheckIcon, XIcon } from "lucide-react";

import type { NodeEntry, TCommentText, Value } from "platejs";

import { KEYS, nanoid, NodeApi } from "platejs";

import type { CreatePlateEditorOptions } from "platejs/react";

import { Plate, useEditorPlugin, useEditorRef, usePlateEditor, usePluginOption } from "platejs/react";

import { ButtonClickPanelNoteComment } from "@/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.Note.Comment";

import { Avatar, AvatarFallback, AvatarImage } from "@/chip/ui/avatar";

import { Button } from "@/chip/ui/button/button";

import { CommentMoreDropdown } from "./comment-more-dropdown";

import { Editor, EditorContainer } from "./editor";

import { BasicMarksKit } from "@/components/editor/plugins/basic-marks-kit";

import type { TDiscussion } from "@/components/editor/plugins/discussion-kit";

import { discussionPlugin } from "@/components/editor/plugins/discussion-kit";



type TComment = {
  id: string;
  contentRich: Value;
  createdAt: Date;
  discussionId: string;
  isEdited: boolean;
  userId: string;
};

type CommentCreateFormProps = {
  autoFocus?: boolean;
  className?: string;
  discussionId?: string;
  focusOnMount?: boolean;
};



const useCommentEditor = (
  options: Omit<CreatePlateEditorOptions, "plugins"> = {},
  deps: React.DependencyList = [],
) => {
  const commentEditor = usePlateEditor(
    {
      id: "comment",
      plugins: BasicMarksKit,
      value: [],
      ...options,
    },
    deps,
  );
  return commentEditor;
};

const formatCommentDate = (date: Date) => {
  const now = new Date();
  const diffMinutes = differenceInMinutes(now, date);
  const diffHours = differenceInHours(now, date);
  const diffDays = differenceInDays(now, date);
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  if (diffDays < 2) {
    return `${diffDays}d`;
  }
  return format(date, "MM/dd/yyyy");
};



const Comment = (props: {
  comment: TComment;
  discussionLength: number;
  editingId: string | null;
  index: number;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  documentContent?: string;
  showDocumentContent?: boolean;
  onEditorClick?: () => void;
}) => {
  const {
    comment,
    discussionLength,
    documentContent,
    editingId,
    index,
    setEditingId,
    showDocumentContent = false,
    onEditorClick,
  } = props;
  const editor = useEditorRef();
  const userInfo = usePluginOption(discussionPlugin, "user", comment.userId);
  const currentUserId = usePluginOption(discussionPlugin, "currentUserId");
  const resolveDiscussion = async (id: string) => {
    const updatedDiscussions = editor
      .getOption(discussionPlugin, "discussions")
      .map((discussion) => {
        if (discussion.id === id) {
          return { ...discussion, isResolved: true };
        }
        return discussion;
      });
    editor.setOption(discussionPlugin, "discussions", updatedDiscussions);
  };
  const removeDiscussion = async (id: string) => {
    const updatedDiscussions = editor
      .getOption(discussionPlugin, "discussions")
      .filter((discussion) => discussion.id !== id);
    editor.setOption(discussionPlugin, "discussions", updatedDiscussions);
  };
  const updateComment = async (input: {
    id: string;
    contentRich: Value;
    discussionId: string;
    isEdited: boolean;
  }) => {
    const updatedDiscussions = editor
      .getOption(discussionPlugin, "discussions")
      .map((discussion) => {
        if (discussion.id === input.discussionId) {
          const updatedComments = discussion.comments.map((currentComment) => {
            if (currentComment.id === input.id) {
              return {
                ...currentComment,
                contentRich: input.contentRich,
                isEdited: true,
                updatedAt: new Date(),
              };
            }
            return currentComment;
          });
          return { ...discussion, comments: updatedComments };
        }
        return discussion;
      });
    editor.setOption(discussionPlugin, "discussions", updatedDiscussions);
  };
  const { tf } = useEditorPlugin(CommentPlugin);
  const isMyComment = currentUserId === comment.userId;
  const initialValue = comment.contentRich;
  const commentEditor = useCommentEditor(
    {
      id: comment.id,
      value: initialValue,
    },
    [initialValue],
  );
  const onCancel = () => {
    setEditingId(null);
    commentEditor.tf.replaceNodes(initialValue, {
      at: [],
      children: true,
    });
  };
  const onSave = () => {
    void updateComment({
      id: comment.id,
      contentRich: commentEditor.children,
      discussionId: comment.discussionId,
      isEdited: true,
    });
    setEditingId(null);
  };
  const onResolveComment = () => {
    void resolveDiscussion(comment.discussionId);
    tf.comment.unsetMark({ id: comment.discussionId });
  };
  const isFirst = index === 0;
  const isLast = index === discussionLength - 1;
  const isEditing = editingId && editingId === comment.id;
  const [hovering, setHovering] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative flex items-center">
        <Avatar className="size-5">
          <AvatarImage alt={userInfo?.name} src={userInfo?.avatarUrl} />
          <AvatarFallback>{userInfo?.name?.[0]}</AvatarFallback>
        </Avatar>
        <h4 className="mx-2 font-semibold text-sm leading-none">
          {userInfo?.name}
        </h4>
        <div className="text-muted-foreground/80 text-xs leading-none">
          <span className="mr-1">
            {formatCommentDate(new Date(comment.createdAt))}
          </span>
          {comment.isEdited && <span>(edited)</span>}
        </div>
        {isMyComment && (hovering || dropdownOpen) && (
          <div className="absolute top-0 right-0 flex space-x-1">
            {index === 0 && (
              <Button
                variant="ghost"
                className="h-6 p-1 text-muted-foreground"
                onClick={onResolveComment}
                type="button"
              >
                <CheckIcon className="size-4" />
              </Button>
            )}
            <CommentMoreDropdown
              onCloseAutoFocus={() => {
                setTimeout(() => {
                  commentEditor.tf.focus({ edge: "endEditor" });
                }, 0);
              }}
              onRemoveComment={() => {
                if (discussionLength === 1) {
                  tf.comment.unsetMark({ id: comment.discussionId });
                  void removeDiscussion(comment.discussionId);
                }
              }}
              comment={comment}
              dropdownOpen={dropdownOpen}
              setDropdownOpen={setDropdownOpen}
              setEditingId={setEditingId}
            />
          </div>
        )}
      </div>
      {isFirst && showDocumentContent && (
        <div className="relative mt-1 flex pl-8 text-muted-foreground text-sm">
          {discussionLength > 1 && (
            <div className="absolute top-1 left-3 h-full w-0.5 shrink-0 bg-muted" />
          )}
          <div className="my-px w-0.5 shrink-0 bg-muted-foreground/35" />
          {documentContent && <div className="ml-2">{documentContent}</div>}
        </div>
      )}
      <div className="relative my-1 pl-7">
        {!isLast && (
          <div className="absolute top-0 left-3 h-full w-0.5 shrink-0 bg-muted" />
        )}
        <Plate readOnly={!isEditing} editor={commentEditor}>
          <EditorContainer variant="comment">
            <Editor
              variant="comment"
              className="w-auto grow"
              onClick={() => onEditorClick?.()}
            />
            {isEditing && (
              <div className="ml-auto flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    void onCancel();
                  }}
                >
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
                    <XIcon className="size-3 stroke-[3px] text-muted-foreground" />
                  </div>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    void onSave();
                  }}
                >
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground">
                    <CheckIcon className="size-3 stroke-[3px] text-background" />
                  </div>
                </Button>
              </div>
            )}
          </EditorContainer>
        </Plate>
      </div>
    </div>
  );
};

const CommentCreateForm = ({ autoFocus = false, className, discussionId: discussionIdProp, focusOnMount = false }: CommentCreateFormProps) => {
  const discussions = usePluginOption(discussionPlugin, "discussions");
  const editor = useEditorRef();
  const commentId = useCommentId();
  const discussionId = discussionIdProp ?? commentId;
  const userInfo = usePluginOption(discussionPlugin, "currentUser");
  const [commentValue, setCommentValue] = React.useState<Value | undefined>();
  const commentContent = React.useMemo(
    () =>
      commentValue
        ? NodeApi.string({ children: commentValue, type: KEYS.p })
        : "",
    [commentValue],
  );
  const commentEditor = useCommentEditor();
  React.useEffect(() => {
    if (commentEditor && focusOnMount) {
      commentEditor.tf.focus();
    }
  }, [commentEditor, focusOnMount]);
  const onAddComment = React.useCallback(async () => {
    if (!commentValue) return;
    commentEditor.tf.reset();
    if (discussionId) {
      const discussion = discussions.find((currentDiscussion) => currentDiscussion.id === discussionId);
      if (!discussion) {
        const newDiscussion: TDiscussion = {
          id: discussionId,
          comments: [
            {
              id: nanoid(),
              contentRich: commentValue,
              createdAt: new Date(),
              discussionId,
              isEdited: false,
              userId: editor.getOption(discussionPlugin, "currentUserId"),
            },
          ],
          createdAt: new Date(),
          isResolved: false,
          userId: editor.getOption(discussionPlugin, "currentUserId"),
        };
        editor.setOption(discussionPlugin, "discussions", [
          ...discussions,
          newDiscussion,
        ]);
        return;
      }
      const comment: TComment = {
        id: nanoid(),
        contentRich: commentValue,
        createdAt: new Date(),
        discussionId,
        isEdited: false,
        userId: editor.getOption(discussionPlugin, "currentUserId"),
      };
      const updatedDiscussion = {
        ...discussion,
        comments: [...discussion.comments, comment],
      };
      const updatedDiscussions = discussions
        .filter((currentDiscussion) => currentDiscussion.id !== discussionId)
        .concat(updatedDiscussion);
      editor.setOption(discussionPlugin, "discussions", updatedDiscussions);
      return;
    }
    const commentsNodeEntry = editor
      .getApi(CommentPlugin)
      .comment.nodes({ at: [], isDraft: true });
    if (commentsNodeEntry.length === 0) return;
    const documentContent = commentsNodeEntry
      .map(([node]: NodeEntry<TCommentText>) => node.text)
      .join("");
    const createdDiscussionId = nanoid();
    const newDiscussion: TDiscussion = {
      id: createdDiscussionId,
      comments: [
        {
          id: nanoid(),
          contentRich: commentValue,
          createdAt: new Date(),
          discussionId: createdDiscussionId,
          isEdited: false,
          userId: editor.getOption(discussionPlugin, "currentUserId"),
        },
      ],
      createdAt: new Date(),
      documentContent,
      isResolved: false,
      userId: editor.getOption(discussionPlugin, "currentUserId"),
    };
    editor.setOption(discussionPlugin, "discussions", [
      ...discussions,
      newDiscussion,
    ]);
    const id = newDiscussion.id;
    commentsNodeEntry.forEach(([, path]: NodeEntry<TCommentText>) => {
      editor.tf.setNodes(
        {
          [getCommentKey(id)]: true,
        },
        { at: path, split: true },
      );
      editor.tf.unsetNodes([getDraftCommentKey()], { at: path });
    });
  }, [commentValue, commentEditor.tf, discussionId, editor, discussions]);
  return (
    <ButtonClickPanelNoteComment
      autoFocus={autoFocus}
      className={className}
      commentContent={commentContent}
      commentEditor={commentEditor}
      userInfo={userInfo}
      onAddComment={onAddComment}
      onCommentValueChange={setCommentValue}
    />
  );
};



export { Comment, CommentCreateForm, formatCommentDate };



export type { TComment };
