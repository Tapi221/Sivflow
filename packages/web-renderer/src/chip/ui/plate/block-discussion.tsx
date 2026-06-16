"use client";

import * as React from "react";
import { getDraftCommentKey } from "@platejs/comment";
import { CommentPlugin } from "@platejs/comment/react";
import { getTransientSuggestionKey } from "@platejs/suggestion";
import { SuggestionPlugin } from "@platejs/suggestion/react";
import { Button } from "@web-renderer/chip/button/button/button";
import { BlockSuggestionCard, isResolvedSuggestion } from "@web-renderer/chip/ui/plate/block-suggestion";
import { Comment, CommentCreateForm } from "@web-renderer/chip/ui/plate/comment";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@web-renderer/chip/ui/popover";
import { MessageSquareTextIcon, MessagesSquareIcon, PencilLineIcon } from "lucide-react";
import type { AnyPluginConfig, NodeEntry } from "platejs";
import { PathApi } from "platejs";
import type { PlateElementProps, RenderNodeWrapper } from "platejs/react";
import { useEditorRef, usePluginOption } from "platejs/react";
import { commentPlugin } from "@/components/editor/plugins/comment-kit";
import type { TDiscussion } from "@/components/editor/plugins/discussion-kit";
import { suggestionPlugin } from "@/components/editor/plugins/suggestion-kit";
import { useBlockDiscussionItems } from "@/lib/block-discussion-index";

type BlockCommentProps = {
  discussion: TDiscussion;
  isLast: boolean;
};

const BlockComment = ({ discussion, isLast }: BlockCommentProps) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  return (
    <>
      <div className="p-4">
        {discussion.comments.map((comment, index) => (
          <Comment
            key={comment.id ?? index}
            comment={comment}
            discussionLength={discussion.comments.length}
            documentContent={discussion?.documentContent}
            editingId={editingId}
            index={index}
            setEditingId={setEditingId}
            showDocumentContent
          />
        ))}
        <CommentCreateForm discussionId={discussion.id} />
      </div>
      {!isLast && <div className="h-px w-full bg-muted" />}
    </>
  );
};
const BlockCommentContent = ({ children, element }: PlateElementProps) => {
  const editor = useEditorRef();
  const commentsApi = editor.getApi(CommentPlugin).comment;
  const blockPath = React.useMemo(() => editor.api.findPath(element) ?? [], [editor, element]);
  const isTopLevelBlock = blockPath.length === 1;
  const draftCommentNode = isTopLevelBlock ? commentsApi.node({ at: blockPath, isDraft: true }) : undefined;
  const commentNodes = React.useMemo(() => isTopLevelBlock ? [...commentsApi.nodes({ at: blockPath })] : [], [blockPath, commentsApi, isTopLevelBlock]);
  const suggestionNodes = React.useMemo(() => isTopLevelBlock ? [...editor.getApi(SuggestionPlugin).suggestion.nodes({ at: blockPath })].filter(([node]) => !node[getTransientSuggestionKey()]) : [], [blockPath, editor, isTopLevelBlock]);
  const { resolvedDiscussions, resolvedSuggestions } = useBlockDiscussionItems(blockPath);
  const suggestionsCount = resolvedSuggestions.length;
  const discussionsCount = resolvedDiscussions.length;
  const totalCount = suggestionsCount + discussionsCount;
  const activeSuggestionId = usePluginOption(suggestionPlugin, "activeId");
  const activeSuggestion = typeof activeSuggestionId === "string" ? resolvedSuggestions.find((suggestion) => suggestion.suggestionId === activeSuggestionId) : undefined;
  const commentingBlock = usePluginOption(commentPlugin, "commentingBlock");
  const activeCommentId = usePluginOption(commentPlugin, "activeId");
  const isCommenting = activeCommentId === getDraftCommentKey();
  const activeDiscussion = typeof activeCommentId === "string" ? resolvedDiscussions.find((discussion) => discussion.id === activeCommentId) : undefined;
  const noneActive = !activeSuggestion && !activeDiscussion;
  const sortedMergedData = [...resolvedDiscussions, ...resolvedSuggestions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const selected = resolvedDiscussions.some((discussion) => discussion.id === activeCommentId) || resolvedSuggestions.some((suggestion) => suggestion.suggestionId === activeSuggestionId);
  const [_open, setOpen] = React.useState(selected);
  const commentingCurrent = !!commentingBlock && PathApi.equals(blockPath, commentingBlock);
  const open = _open || selected || (isCommenting && !!draftCommentNode && commentingCurrent);
  const anchorElement = React.useMemo(() => {
    let activeNode: NodeEntry | undefined;
    if (activeSuggestion) {
      activeNode = suggestionNodes.find(([node]) => editor.getApi(SuggestionPlugin).suggestion.nodeId(node) === activeSuggestion.suggestionId);
    }
    if (activeCommentId) {
      activeNode = activeCommentId === getDraftCommentKey() ? draftCommentNode : commentNodes.find(([node]) => editor.getApi(commentPlugin).comment.nodeId(node) === activeCommentId);
    }
    if (!activeNode) return null;
    return editor.api.toDOMNode(activeNode[0])!;
  }, [activeSuggestion, activeCommentId, commentNodes, draftCommentNode, editor, suggestionNodes]);
  const popoverContent = (() => {
    if (isCommenting) {
      return <CommentCreateForm className="p-4" focusOnMount />;
    }
    if (noneActive) {
      return sortedMergedData.map((item, index) =>
        isResolvedSuggestion(item) ? (
          <BlockSuggestionCard
            key={item.suggestionId}
            idx={index}
            isLast={index === sortedMergedData.length - 1}
            suggestion={item}
          />
        ) : (
          <BlockComment
            key={item.id}
            discussion={item}
            isLast={index === sortedMergedData.length - 1}
          />
        ),
      );
    }
    return (
      <>
        {activeSuggestion !== undefined && (
          <BlockSuggestionCard
            key={activeSuggestion.suggestionId}
            idx={0}
            isLast={true}
            suggestion={activeSuggestion}
          />
        )}
        {activeDiscussion !== undefined && (
          <BlockComment discussion={activeDiscussion} isLast={true} />
        )}
      </>
    );
  })();
  const commentTriggerIcon = (() => {
    if (suggestionsCount > 0 && discussionsCount === 0) {
      return <PencilLineIcon className="size-4 shrink-0" />;
    }
    if (suggestionsCount === 0 && discussionsCount > 0) {
      return <MessageSquareTextIcon className="size-4 shrink-0" />;
    }
    if (suggestionsCount > 0 && discussionsCount > 0) {
      return <MessagesSquareIcon className="size-4 shrink-0" />;
    }
    return null;
  })();
  if (!isTopLevelBlock) return children;
  if (suggestionsCount + resolvedDiscussions.length === 0 && !draftCommentNode) return <div className="w-full">{children}</div>;
  return (
    <div className="flex w-full justify-between">
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && isCommenting && draftCommentNode) {
            editor.tf.unsetNodes(getDraftCommentKey(), {
              at: [],
              mode: "lowest",
              match: (node) => node[getDraftCommentKey()],
            });
          }
          setOpen(nextOpen);
        }}
      >
        <div className="w-full">{children}</div>
        {anchorElement !== null && <PopoverAnchor asChild className="w-full" virtualRef={{ current: anchorElement }} />}
        <PopoverContent
          className="max-h-96 w-96 min-w-32 max-w-full overflow-y-auto p-0 data-[state=closed]:opacity-0"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => event.preventDefault()}
          align="center"
          side="bottom"
        >
          {popoverContent}
        </PopoverContent>
        {totalCount > 0 && (
          <div className="relative left-0 size-0 select-none">
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="!px-1.5 mt-1 ml-1 flex h-6 gap-1 py-0 text-muted-foreground/80 hover:text-muted-foreground/80 data-[active=true]:bg-muted"
                data-active={open}
                contentEditable={false}
              >
                {commentTriggerIcon}
                <span className="font-semibold text-xs">{totalCount}</span>
              </Button>
            </PopoverTrigger>
          </div>
        )}
      </Popover>
    </div>
  );
};
const BlockDiscussion: RenderNodeWrapper<AnyPluginConfig> = (_props) => (props) => <BlockCommentContent {...props} />;

export { BlockDiscussion };
