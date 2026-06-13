"use client";

import * as React from "react";
import { getDraftCommentKey } from "@platejs/comment";
import { CommentPlugin } from "@platejs/comment/react";
import { getTransientSuggestionKey } from "@platejs/suggestion";
import { SuggestionPlugin } from "@platejs/suggestion/react";
import { MessageSquareTextIcon, MessagesSquareIcon, PencilLineIcon } from "lucide-react";
import type { AnyPluginConfig, NodeEntry } from "platejs";
import { PathApi } from "platejs";
import type { PlateElementProps, RenderNodeWrapper } from "platejs/react";
import { useEditorRef, usePluginOption } from "platejs/react";
import { BlockSuggestionCard, isResolvedSuggestion } from "@/chip/ui/plate/block-suggestion";
import { Button } from "@/chip/ui/button/button";
import { Comment, CommentCreateForm } from "@/chip/ui/comment";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/chip/ui/popover";
import { commentPlugin } from "@/components/editor/plugins/comment-kit";
import type { TDiscussion } from "@/components/editor/plugins/discussion-kit";
import { suggestionPlugin } from "@/components/editor/plugins/suggestion-kit";
import { useBlockDiscussionItems } from "@/lib/block-discussion-index";

const BlockComment = ({ discussion, isLast }: { discussion: TDiscussion; isLast: boolean; }) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  return (
    <>
      <div className="p-4">
        {discussion.comments.map((comment, index) => <Comment key={comment.id ?? index} comment={comment} discussionLength={discussion.comments.length} documentContent={discussion?.documentContent} editingId={editingId} index={index} setEditingId={setEditingId} showDocumentContent />)}
        <CommentCreateForm discussionId={discussion.id} />
      </div>
      {!isLast && <div className="h-px w-full bg-muted" />}
    </>
  );
};
const BlockCommentContent = ({ children, element }: PlateElementProps) => {
  const editor = useEditorRef();
  const commentsApi = editor.getApi(CommentPlugin).comment;
  const blockPath = editor.api.findPath(element) ?? [];
  const isTopLevelBlock = blockPath.length === 1;
  const draftCommentNode = isTopLevelBlock ? commentsApi.node({ at: blockPath, isDraft: true }) : undefined;
  const commentNodes = isTopLevelBlock ? [...commentsApi.nodes({ at: blockPath })] : [];
  const suggestionNodes = isTopLevelBlock ? [...editor.getApi(SuggestionPlugin).suggestion.nodes({ at: blockPath })].filter(([node]) => !node[getTransientSuggestionKey()]) : [];
  const { resolvedDiscussions, resolvedSuggestions } = useBlockDiscussionItems(blockPath);
  const suggestionsCount = resolvedSuggestions.length;
  const discussionsCount = resolvedDiscussions.length;
  const totalCount = suggestionsCount + discussionsCount;
  const activeSuggestionId = usePluginOption(suggestionPlugin, "activeId");
  const activeSuggestion = activeSuggestionId && resolvedSuggestions.find((s) => s.suggestionId === activeSuggestionId);
  const commentingBlock = usePluginOption(commentPlugin, "commentingBlock");
  const activeCommentId = usePluginOption(commentPlugin, "activeId");
  const isCommenting = activeCommentId === getDraftCommentKey();
  const activeDiscussion = activeCommentId && resolvedDiscussions.find((d) => d.id === activeCommentId);
  const noneActive = !activeSuggestion && !activeDiscussion;
  const sortedMergedData = [...resolvedDiscussions, ...resolvedSuggestions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const selected = resolvedDiscussions.some((d) => d.id === activeCommentId) || resolvedSuggestions.some((s) => s.suggestionId === activeSuggestionId);
  const [_open, setOpen] = React.useState(selected);
  const commentingCurrent = !!commentingBlock && PathApi.equals(blockPath, commentingBlock);
  const open = _open || selected || (isCommenting && !!draftCommentNode && commentingCurrent);
  const anchorElement = React.useMemo(() => {
    let activeNode: NodeEntry | undefined;
    if (activeSuggestion) activeNode = suggestionNodes.find(([node]) => editor.getApi(SuggestionPlugin).suggestion.nodeId(node) === activeSuggestion.suggestionId);
    if (activeCommentId) activeNode = activeCommentId === getDraftCommentKey() ? draftCommentNode : commentNodes.find(([node]) => editor.getApi(commentPlugin).comment.nodeId(node) === activeCommentId);
    if (!activeNode) return null;
    return editor.api.toDOMNode(activeNode[0])!;
  }, [activeSuggestion, activeCommentId, commentNodes, draftCommentNode, editor.api, suggestionNodes]);
  if (!isTopLevelBlock) return children;
  if (suggestionsCount + resolvedDiscussions.length === 0 && !draftCommentNode) return <div className="w-full">{children}</div>;
  return (
    <div className="flex w-full justify-between">
      <Popover
        open={open}
        onOpenChange={(_open_) => {
          if (!_open_ && isCommenting && draftCommentNode) {
            editor.tf.unsetNodes(getDraftCommentKey(), {
              at: [],
              mode: "lowest",
              match: (n) => n[getDraftCommentKey()],
            });
          }
          setOpen(_open_);
        }}
      >
        <div className="w-full">{children}</div>
        {anchorElement && <PopoverAnchor asChild className="w-full" virtualRef={{ current: anchorElement }} />}
        <PopoverContent
          className="max-h-[min(50dvh,calc(-24px+var(--radix-popper-available-height)))] w-[380px] min-w-[130px] max-w-[calc(100vw-24px)] overflow-y-auto p-0 data-[state=closed]:opacity-0"
          onCloseAutoFocus={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          align="center"
          side="bottom"
        >
          {isCommenting ? (
            <CommentCreateForm className="p-4" focusOnMount />
          ) : noneActive ? (
            sortedMergedData.map((item, index) =>
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
            )
          ) : (
            <>
              {activeSuggestion ? (
                <BlockSuggestionCard
                  key={activeSuggestion.suggestionId}
                  idx={0}
                  isLast={true}
                  suggestion={activeSuggestion}
                />
              ) : null}
              {activeDiscussion ? (
                <BlockComment discussion={activeDiscussion} isLast={true} />
              ) : null}
            </>
          )}
        </PopoverContent>
        {totalCount > 0 ? (
          <div className="relative left-0 size-0 select-none">
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="!px-1.5 mt-1 ml-1 flex h-6 gap-1 py-0 text-muted-foreground/80 hover:text-muted-foreground/80 data-[active=true]:bg-muted"
                data-active={open}
                contentEditable={false}
              >
                {suggestionsCount > 0 && discussionsCount === 0 ? (
                  <PencilLineIcon className="size-4 shrink-0" />
                ) : null}
                {suggestionsCount === 0 && discussionsCount > 0 ? (
                  <MessageSquareTextIcon className="size-4 shrink-0" />
                ) : null}
                {suggestionsCount > 0 && discussionsCount > 0 ? (
                  <MessagesSquareIcon className="size-4 shrink-0" />
                ) : null}
                <span className="font-semibold text-xs">{totalCount}</span>
              </Button>
            </PopoverTrigger>
          </div>
        ) : null}
      </Popover>
    </div>
  );
};
const BlockDiscussion: RenderNodeWrapper<AnyPluginConfig> = (_props) => (props) => <BlockCommentContent {...props} />;

export { BlockDiscussion };
