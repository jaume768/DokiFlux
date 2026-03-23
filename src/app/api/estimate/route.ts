import { SYSTEM_PROMPT } from "@/lib/prompts";
import { estimateCost } from "@/lib/pricing";
import { GenerateRequest } from "@/types";
import { encode } from "gpt-tokenizer";

export async function POST(req: Request) {
  try {
    const { prompt, history } = (await req.json()) as GenerateRequest;

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Build the full text that will be sent as input to the model
    let fullText = SYSTEM_PROMPT + "\n";

    if (history && history.length > 0) {
      for (const msg of history) {
        if (msg.role === "user" || msg.role === "assistant") {
          fullText += msg.content + "\n";
        }
      }
    }

    fullText += prompt;

    // Count tokens with gpt-tokenizer (pure JS, no WASM)
    const inputTokens = encode(fullText).length;

    const hasHistory = !!(history && history.length > 0);
    const estimate = estimateCost(inputTokens, hasHistory);

    return Response.json({ estimate });
  } catch (err) {
    console.error("[estimate/POST]", err);
    return Response.json(
      { error: "Failed to estimate cost" },
      { status: 500 }
    );
  }
}
