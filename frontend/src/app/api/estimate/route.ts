import { SYSTEM_PROMPT } from "@/lib/prompts";
import { estimateCost } from "@/lib/pricing";
import { GenerateRequest } from "@/types";
import { encode } from "gpt-tokenizer";

export async function POST(req: Request) {
  try {
    const { prompt, currentProject, chatHistory } =
      (await req.json()) as GenerateRequest;

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Build the full text that will be sent as input to the model
    let fullText = SYSTEM_PROMPT + "\n";

    if (currentProject) {
      fullText += currentProject + "\n";
    }

    if (chatHistory && chatHistory.length > 0) {
      for (const msg of chatHistory) {
        fullText += msg.content + "\n";
      }
    }

    fullText += prompt;

    // Count tokens with gpt-tokenizer (pure JS, no WASM)
    const inputTokens = encode(fullText).length;

    const hasHistory = !!(chatHistory && chatHistory.length > 0) || !!currentProject;
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
