"use client";

import { useRealChat } from "@/components/editor/use-real-chat";
import type { Chat, ChatMessage, MessageDataPart, TComment, TTableCellUpdate, ToolName } from "@/components/editor/use-real-chat";

const useChat = useRealChat;

export { useChat };
export type { ToolName, TComment, TTableCellUpdate, MessageDataPart, Chat, ChatMessage };
