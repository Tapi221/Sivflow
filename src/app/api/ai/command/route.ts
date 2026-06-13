import { createGateway } from "@ai-sdk/gateway";
import type { UIMessageStreamWriter } from "ai";
import { createUIMessageStream, createUIMessageStreamResponse, generateText, Output, streamText } from "ai";
import type { SlateEditor, Value } from "platejs";
import { createSlateEditor } from "platejs";
import { AI_COMMAND_PLATE_PLUGINS } from "@/app/api/ai/command/editorKit";
import { getChooseToolPrompt, getEditPrompt, getGeneratePrompt } from "@/app/api/ai/command/prompt";
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

const DEFAULT_ROUTING_MODEL = "google/gemini-2.5-flash";
const DEFAULT_TEXT_MODEL = "openai/gpt-4o-mini";

const createErrorResponse = (status: number, error: string) => Response.json({ error }, { status });
const writeToolName = (writer: UIMessageStreamWriter<ChatMessage>, toolName: ToolName) => {
  writer.write({
    data: toolName,
    type: "data-toolName",
  });
};
const POST = async (req: Request) => {
  try {
    const { apiKey, ctx, messages: messagesRaw, model } = await req.json() as CommandRequestPayload;
    const { children, selection, toolName: toolNameParam } = ctx;
    const editor = createSlateEditor({
      plugins: AI_COMMAND_PLATE_PLUGINS,
      selection,
      value: children,
    });
    const credential = apiKey ?? process.env.AI_GATEWAY_API_KEY;
    if (!credential) {
      return createErrorResponse(401, "Missing AI credential.");
    }
    const isSelecting = editor.api.isExpanded();
    const gatewayProvider = createGateway({ apiKey: credential });
    const responseStream = createUIMessageStream<ChatMessage>({
      execute: async ({ writer }) => {
        let toolName = toolNameParam;
        if (!toolName) {
          const routingPrompt = getChooseToolPrompt({
            isSelecting,
            messages: messagesRaw,
          });
          const options = isSelecting ? ["generate", "edit", "comment"] : ["generate", "comment"];
          const { output } = await generateText({
            model: gatewayProvider(model ?? DEFAULT_ROUTING_MODEL),
            output: Output.choice({ options }),
            prompt: routingPrompt,
          });
          toolName = output as ToolName;
          writeToolName(writer, toolName);
        }
        const prompt = toolName === "edit"
          ? getEditPrompt(editor, { isSelecting, messages: messagesRaw })[0]
          : getGeneratePrompt(editor, { isSelecting, messages: messagesRaw });
        const aiStream = streamText({
          model: gatewayProvider(model ?? DEFAULT_TEXT_MODEL),
          prompt,
        });
        writer.merge(aiStream.toUIMessageStream({ sendFinish: false }));
      },
    });
    return createUIMessageStreamResponse({ stream: responseStream });
  } catch {
    return createErrorResponse(500, "Failed to process AI request.");
  }
};

export { POST };
