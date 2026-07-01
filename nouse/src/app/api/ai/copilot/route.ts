import { createGateway } from "@ai-sdk/gateway";
import { streamText } from "ai";



type CopilotRequestPayload = {
  apiKey?: string;
  model?: string;
  prompt?: string;
  system?: string;
};



const DEFAULT_COPILOT_MODEL = "openai/gpt-4o-mini";



const createErrorResponse = (status: number, error: string) => Response.json({ error }, { status });



const POST = async (req: Request) => {
  try {
    const { apiKey, model, prompt, system } = await req.json() as CopilotRequestPayload;
    const credential = apiKey ?? process.env.AI_GATEWAY_API_KEY;
    if (!credential) {
      return createErrorResponse(401, "AI 認証情報が未設定です。");
    }
    const gatewayProvider = createGateway({ apiKey: credential });
    const result = streamText({
      model: gatewayProvider(model ?? DEFAULT_COPILOT_MODEL),
      prompt: prompt ?? "",
      system,
    });
    return result.toTextStreamResponse();
  } catch {
    return createErrorResponse(500, "copilot request の処理に失敗しました。");
  }
};



export { POST };
