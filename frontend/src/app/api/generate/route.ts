import { getOpenAIClient } from "@/lib/openai";
import { SYSTEM_PROMPT, CODEGEN_RULES } from "@/lib/prompts";
import { calculateCost, getModelConfig, DEFAULT_MODEL } from "@/lib/pricing";
import { GenerateRequest } from "@/types";

export const maxDuration = 120;

const GENERATE_UI_TOOL = {
  type: "function" as const,
  name: "generate_ui",
  description: CODEGEN_RULES,
  parameters: {
    type: "object" as const,
    properties: {
      code: {
        type: "string" as const,
        description:
          "The complete multi-file code output using // --- FILE: /path --- markers. Must follow all code generation rules exactly.",
      },
    },
    required: ["code"],
    additionalProperties: false,
  },
  strict: true,
};

export async function POST(req: Request) {
  try {
    const { prompt, currentProject, chatHistory } =
      (await req.json()) as GenerateRequest;

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    // --- Compressed history: project state + last N chat messages ---
    const inputMessages: Array<{
      role: "developer" | "user" | "assistant";
      content: string;
    }> = [];

    // Inject current project state as a single context message
    if (currentProject) {
      inputMessages.push({
        role: "developer",
        content: `Current project state (all files):\n${currentProject}`,
      });
    }

    // Add only the last N chat messages for conversation context
    if (chatHistory && chatHistory.length > 0) {
      for (const msg of chatHistory) {
        inputMessages.push({ role: msg.role, content: msg.content });
      }
    }

    inputMessages.push({ role: "user", content: prompt });

    const openai = getOpenAIClient();
    const stream = await openai.responses.create({
      model: "gpt-5.4",
      instructions: SYSTEM_PROMPT,
      input: inputMessages,
      tools: [GENERATE_UI_TOOL],
      max_output_tokens: getModelConfig(DEFAULT_MODEL).maxOutputTokens,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let inputTokens = 0;
          let outputTokens = 0;

          for await (const event of stream) {
            // Text output (conversation mode)
            if (
              event.type === "response.output_text.delta" &&
              "delta" in event
            ) {
              const data = JSON.stringify({
                type: "chat",
                content: event.delta,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            // Function call arguments (code generation mode)
            if (
              event.type === "response.function_call_arguments.delta" &&
              "delta" in event
            ) {
              const data = JSON.stringify({
                type: "text",
                content: event.delta,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            if (event.type === "response.completed" && "response" in event) {
              const usage = event.response?.usage;
              if (usage) {
                inputTokens = usage.input_tokens ?? 0;
                outputTokens = usage.output_tokens ?? 0;
              }
            }
          }

          const cost = calculateCost(inputTokens, outputTokens);
          const usageData = JSON.stringify({
            type: "usage",
            usage: {
              inputTokens,
              outputTokens,
              cost,
            },
          });
          controller.enqueue(encoder.encode(`data: ${usageData}\n\n`));

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
        } catch (err) {
          console.error("[generate/stream]", err);
          const errorData = JSON.stringify({
            type: "error",
            error:
              "Something went wrong while generating. Please try again.",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[generate/POST]", err);
    return Response.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
