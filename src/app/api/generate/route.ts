import { getOpenAIClient } from "@/lib/openai";
import { SYSTEM_PROMPT } from "@/lib/prompts";
import { calculateCost } from "@/lib/pricing";
import { GenerateRequest } from "@/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt, history } = (await req.json()) as GenerateRequest;

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const inputMessages: Array<{
      role: "developer" | "user" | "assistant";
      content: string;
    }> = [];

    if (history && history.length > 0) {
      for (const msg of history) {
        if (msg.role === "user" || msg.role === "assistant") {
          inputMessages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    inputMessages.push({ role: "user", content: prompt });

    const openai = getOpenAIClient();
    const stream = await openai.responses.create({
      model: "gpt-5.4",
      instructions: SYSTEM_PROMPT,
      input: inputMessages,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let inputTokens = 0;
          let outputTokens = 0;

          for await (const event of stream) {
            if (
              event.type === "response.output_text.delta" &&
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
          const errorData = JSON.stringify({ type: "error", error: "Something went wrong while generating. Please try again." });
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
    return Response.json({ error: "Internal server error. Please try again." }, { status: 500 });
  }
}
