import type { UIMessage } from "ai";



type ToolName = "generate" | "edit" | "comment";
type ChatMessage = UIMessage;

export type { ToolName, ChatMessage };
