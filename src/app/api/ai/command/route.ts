import { createGateway } from "@ai-sdk/gateway";
import { BaseEditorKit } from "@web-renderer/components/editor/editor-base-kit";
import type { LanguageModel, UIMessageStreamWriter } from "ai";
import { createUIMessageStream, createUIMessageStreamResponse, generateText, Output, streamText, tool } from "ai";
import type { SlateEditor, Value } from "platejs";
import { createSlateEditor, nanoid } from "platejs";
import { z } from "zod";
import { buildEditTableMultiCellPrompt, getChooseToolPrompt, getCommentPrompt, getEditPrompt, getGeneratePrompt } from "@/app/api/ai/command/prompt";
import type { ChatMessage, ToolName } from "./types";
import { markdownJoinerTransform } from "@/lib/markdown-joiner-transform";



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
type AiToolProps = {
  messagesRaw: ChatMessage[];
  model: LanguageModel;
  writer: UIMessageStreamWriter<ChatMessage>;
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
const createCommentTool = (editor: SlateEditor, { messagesRaw, model, writer }: AiToolProps) =>
  tool({
    description: "Comment on selected editor content",
    inputSchema: z.object({}),
    strict: true,
    execute: async () => {
      const commentSchema = z.object({
        blockId: z.string(),
        comment: z.string(),
        content: z.string(),
      });
      const { partialOutputStream } = streamText({
        model,
        output: Output.array({ element: commentSchema }),
        prompt: getCommentPrompt(editor, {
          messages: messagesRaw,
        }),
      });
      let lastLength = 0;
      for await (const partialArray of partialOutputStream) {
        for (let i = lastLength; i < partialArray.length; i++) {
          writer.write({
            id: nanoid(),
            data: {
              comment: partialArray[i],
              status: "streaming",
            },
            type: "data-comment",
          });
        }
        lastLength = partialArray.length;
      }
      writer.write({
        id: nanoid(),
        data: {
          comment: null,
          status: "finished",
        },
        type: "data-comment",
      });
    },
  });
const createTableTool = (editor: SlateEditor, { messagesRaw, model, writer }: AiToolProps) =>
  tool({
    description: "Edit selected table cells",
    inputSchema: z.object({}),
    strict: true,
    execute: async () => {
      const cellUpdateSchema = z.object({
        content: z.string(),
        id: z.string(),
      });
      const { partialOutputStream } = streamText({
        model,
        output: Output.array({ element: cellUpdateSchema }),
        prompt: buildEditTableMultiCellPrompt(editor, messagesRaw),
      });
      let lastLength = 0;
      for await (const partialArray of partialOutputStream) {
        for (let i = lastLength; i < partialArray.length; i++) {
          writer.write({
            id: nanoid(),
            data: {
              cellUpdate: partialArray[i],
              status: "streaming",
            },
            type: "data-table",
          });
        }
        lastLength = partialArray.length;
      }
      writer.write({
        id: nanoid(),
        data: {
          cellUpdate: null,
          status: "finished",
        },
        type: "data-table",
      });
    },
  });



const POST = async (req: Request) => {
  try {
    const { apiKey, ctx, messages: messagesRaw, model } = await req.json() as CommandRequestPayload;
    const { children, selection, toolName: toolNameParam } = ctx;
    const editor = createSlateEditor({
      plugins: BaseEditorKit,
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
        const aiStream = streamText({
          experimental_transform: markdownJoinerTransform(),
          model: gatewayProvider(model ?? DEFAULT_TEXT_MODEL),
          prompt: "",
          tools: {
            comment: createCommentTool(editor, {
              messagesRaw,
              model: gatewayProvider(model ?? DEFAULT_ROUTING_MODEL),
              writer,
            }),
            table: createTableTool(editor, {
              messagesRaw,
              model: gatewayProvider(model ?? DEFAULT_ROUTING_MODEL),
              writer,
            }),
          },
          prepareStep: async (step) => {
            if (toolName === "comment") {
              return {
                ...step,
                toolChoice: { toolName: "comment", type: "tool" },
              };
            }
            if (toolName === "edit") {
              const [editPrompt, editType] = getEditPrompt(editor, {
                isSelecting,
                messages: messagesRaw,
              });
              if (editType === "table") {
                return {
                  ...step,
                  toolChoice: { toolName: "table", type: "tool" },
                };
              }
              return {
                ...step,
                activeTools: [],
                messages: [
                  {
                    content: editPrompt,
                    role: "user",
                  },
                ],
                model:
                  editType === "selection"
                    ? gatewayProvider(model ?? DEFAULT_ROUTING_MODEL)
                    : gatewayProvider(model ?? DEFAULT_TEXT_MODEL),
              };
            }
            if (toolName === "generate") {
              const generatePrompt = getGeneratePrompt(editor, {
                isSelecting,
                messages: messagesRaw,
              });
              return {
                ...step,
                activeTools: [],
                messages: [
                  {
                    content: generatePrompt,
                    role: "user",
                  },
                ],
                model: gatewayProvider(model ?? DEFAULT_TEXT_MODEL),
              };
            }
          },
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
