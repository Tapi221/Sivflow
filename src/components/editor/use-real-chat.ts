"use client";

import * as React from "react";
import type { UseChatHelpers } from "@ai-sdk/react";
import { useChat as useBaseChat } from "@ai-sdk/react";
import { withAIBatch } from "@platejs/ai";
import { AIChatPlugin, aiCommentToRange, applyTableCellSuggestion } from "@platejs/ai/react";
import { getCommentKey, getTransientCommentKey } from "@platejs/comment";
import { deserializeMd } from "@platejs/markdown";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import type { TNode } from "platejs";
import { KEYS, nanoid, NodeApi, TextApi } from "platejs";
import type { PlateEditor } from "platejs/react";
import { useEditorRef, usePluginOption } from "platejs/react";
import { aiChatPlugin } from "@/components/editor/plugins/ai-kit";
import { discussionPlugin } from "@/components/editor/plugins/discussion-kit";

type ToolName = "comment" | "edit" | "generate";
type TComment = {
  comment: {
    blockId: string;
    comment: string;
    content: string;
  } | null;
  status: "finished" | "streaming";
};
type TTableCellUpdate = {
  cellUpdate: {
    content: string;
    id: string;
  } | null;
  status: "finished" | "streaming";
};
type MessageDataPart = {
  toolName: ToolName;
  comment?: TComment;
  table?: TTableCellUpdate;
};
type ChatMessage = UIMessage<object, MessageDataPart>;
type Chat = UseChatHelpers<ChatMessage>;

const createChatTransport = ({
  api,
  body,
}: {
  api: string;
  body: Record<string, unknown>;
}) => {
  return new DefaultChatTransport({
    api,
    body,
  });
};
const applyTableUpdate = (editor: PlateEditor, tableData: TTableCellUpdate) => {
  if (tableData.status === "finished") {
    const chatSelection = editor.getOption(AIChatPlugin, "chatSelection");
    if (!chatSelection) return;
    editor.tf.setSelection(chatSelection);
    return;
  }
  const cellUpdate = tableData.cellUpdate;
  if (!cellUpdate) return;
  withAIBatch(editor, () => {
    applyTableCellSuggestion(editor, cellUpdate);
  });
};
const applyCommentUpdate = (editor: PlateEditor, commentData: TComment) => {
  if (commentData.status === "finished") {
    editor.getApi(BlockSelectionPlugin).blockSelection.deselect();
    return;
  }
  const aiComment = commentData.comment;
  if (!aiComment) return;
  const range = aiCommentToRange(editor, aiComment);
  if (!range) return;
  const discussions = editor.getOption(discussionPlugin, "discussions") ?? [];
  const discussionId = nanoid();
  const newComment = {
    id: nanoid(),
    contentRich: [{ children: [{ text: aiComment.comment }], type: "p" }],
    createdAt: new Date(),
    discussionId,
    isEdited: false,
    userId: editor.getOption(discussionPlugin, "currentUserId"),
  };
  const newDiscussion = {
    id: discussionId,
    comments: [newComment],
    createdAt: new Date(),
    documentContent: deserializeMd(editor, aiComment.content)
      .map((node: TNode) => NodeApi.string(node))
      .join("\n"),
    isResolved: false,
    userId: editor.getOption(discussionPlugin, "currentUserId"),
  };
  editor.setOption(discussionPlugin, "discussions", [...discussions, newDiscussion]);
  editor.tf.withMerging(() => {
    editor.tf.setNodes(
      {
        [getCommentKey(newDiscussion.id)]: true,
        [getTransientCommentKey()]: true,
        [KEYS.comment]: true,
      },
      {
        at: range,
        match: TextApi.isText,
        split: true,
      },
    );
  });
};
const useRealChat = () => {
  const editor = useEditorRef();
  const options = usePluginOption(aiChatPlugin, "chatOptions");
  const body = React.useMemo(() => options.body ?? {}, [options.body]);
  const transport = React.useMemo(
    () =>
      createChatTransport({
        api: options.api ?? "/api/ai/command",
        body,
      }),
    [body, options.api],
  );
  const chat = useBaseChat<ChatMessage>({
    id: "editor",
    transport,
    onData(data) {
      if (data.type === "data-toolName") {
        editor.setOption(AIChatPlugin, "toolName", data.data as ToolName);
      }
      if (data.type === "data-table" && data.data) {
        applyTableUpdate(editor, data.data as TTableCellUpdate);
      }
      if (data.type === "data-comment" && data.data) {
        applyCommentUpdate(editor, data.data as TComment);
      }
    },
    ...options,
  });
  React.useEffect(() => {
    editor.setOption(AIChatPlugin, "chat", chat as any);
  }, [chat.status, chat.messages, chat.error]);
  return chat;
};

export { useRealChat };
export type { ToolName, TComment, TTableCellUpdate, MessageDataPart, Chat, ChatMessage };
