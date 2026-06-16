"use client";

import type { BaseCommentConfig } from "@platejs/comment";
import { BaseCommentPlugin, getDraftCommentKey } from "@platejs/comment";
import { CommentLeaf } from "@web-renderer/chip/ui/plate/comment-node";
import type { ExtendConfig, Path } from "platejs";
import { toTPlatePlugin } from "platejs/react";
import { getDiscussionClickTarget } from "@/components/editor/plugins/discussion-kit";

type CommentConfig = ExtendConfig<
  BaseCommentConfig,
  {
    activeId: string | null;
    commentingBlock: Path | null;
    hoverId: string | null;
  }
>;

const commentPlugin = toTPlatePlugin<CommentConfig>(BaseCommentPlugin, {
  handlers: {
    onClick: ({ api, event, setOption, type }) => {
      const activeTarget = getDiscussionClickTarget({
        selector: `.slate-${type}`,
        target: event.target,
      });
      if (!activeTarget) {
        setOption("activeId", null);
        return;
      }
      const commentEntry = api.comment?.node();
      setOption(
        "activeId",
        commentEntry ? (api.comment?.nodeId(commentEntry[0]) ?? null) : null,
      );
    },
  },
  options: {
    activeId: null,
    commentingBlock: null,
    hoverId: null,
  },
})
  .extendTransforms(
    ({
      editor,
      setOption,
      tf: {
        comment: { setDraft },
      },
    }) => ({
      setDraft: () => {
        if (editor.api.isCollapsed()) {
          editor.tf.select(editor.api.block()![1]);
        }
        setDraft();
        editor.tf.collapse();
        setOption("activeId", getDraftCommentKey());
        setOption("commentingBlock", editor.selection!.focus.path.slice(0, 1));
      },
    }),
  )
  .configure({
    node: { component: CommentLeaf },
    shortcuts: {
      setDraft: { keys: "mod+shift+m" },
    },
  });
const CommentKit = [commentPlugin];

export { CommentKit, commentPlugin };
export type { CommentConfig };
