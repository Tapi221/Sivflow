"use client";

import type { Chat, ChatMessage, MessageDataPart, TComment, ToolName, TTableCellUpdate } from "@/components/editor/use-real-chat";
import { useRealChat } from "@/components/editor/use-real-chat";

const useChat = useRealChat;

export { useChat };
export type { ToolName, TComment, TTableCellUpdate, MessageDataPart, Chat, ChatMessage };
