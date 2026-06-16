"use client";

import type { Chat, ChatMessage, MessageDataPart, TComment, ToolName, TTableCellUpdate } from "@web-renderer/components/editor/use-real-chat";
import { useRealChat } from "@web-renderer/components/editor/use-real-chat";

const useChat = useRealChat;

export { useChat };
export type { ToolName, TComment, TTableCellUpdate, MessageDataPart, Chat, ChatMessage };
