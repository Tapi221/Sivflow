"use client";

import type { Chat, ChatMessage, MessageDataPart, TComment, ToolName, TTableCellUpdate } from "./use-real-chat";

import { useRealChat } from "./use-real-chat";



const useChat = useRealChat;



export { useChat };



export type { ToolName, TComment, TTableCellUpdate, MessageDataPart, Chat, ChatMessage };
