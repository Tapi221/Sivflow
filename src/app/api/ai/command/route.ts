import { createGateway } from "@ai-sdk/gateway";
import type { LanguageModel, UIMessageStreamWriter } from "ai";
import { createUIMessageStream, createUIMessageStreamResponse, generateText, Output, streamText, tool } from "ai";
import type { SlateEditor, Value } from "platejs";
import { createSlateEditor, nanoid } from "platejs";
import { z } from "zod";
import { AI_COMMAND_PLATE_PLUGINS } from "@/app/api/ai/command/editorKit";
import { buildEditTableMultiCellPrompt, getChooseToolPrompt, getCommentPrompt, getEditPrompt, getGeneratePrompt } from "@/app/api/ai/command/prompt";
import type { ChatMessage, ToolName } from "@/app/api/ai/command/types";

type CommandContext = {
  children: Value;
  selection: SlateEditor["selection"];
  toolName?: ToolName;
};
type CommandRequestPayload = {
  apiKey?: string;
  ctx: CommandContext;
  messages: ChatMessage[];
  model?: string;
};

the const DEFAULT_CHOOSE_MODEL = "google/gemini-2.5-flash";
