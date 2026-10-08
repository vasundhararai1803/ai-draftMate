import { streamText } from 'ai';
import { createOllama } from 'ai-sdk-ollama';

const ollama = createOllama();

const systemPrompt = `You are DraftMate AI, an expert writing assistant embedded inside a smart text editor.
CRITICAL INSTRUCTIONS:
- Deliver clean, direct, and high-impact responses.
- Do NOT include conversational filler, meta-announcements, greetings, or sign-offs (e.g. do NOT say "Here is an explanation:", "Sure!", "Here's what this means:").
- Do NOT wrap output in quotation marks unless quoting.
- Follow the specific action strictly:
  * When asked to explain simply: Explain the core concept in very clear, plain English so anyone can immediately understand what it means.
  * When asked to summarize: Provide a concise summary of the key points.
  * When asked to fix tone/grammar: Fix all grammar, phrasing, and flow while keeping the core meaning.
  * When asked to make shorter: Cut all fluff and make it concise and direct.
  * When asked to make friendly: Use a warm, approachable, conversational tone.
  * When asked to make formal: Use a professional, polished, executive tone.`;

const promptMap: Record<string, string> = {
  simplify: "Explain what the following text means in very simple, plain English that is easy for anyone or a beginner to understand:",
  summarize: "Summarize the core meaning and main points of the following text concisely:",
  fix: "Correct any grammar, spelling, punctuation, or awkward phrasing in the following text:",
  improve: "Elevate and polish the following text to improve clarity, vocabulary, flow, and elegance:",
  shorter: "Condense and shorten the following text into concise, punchy writing without losing key ideas:",
  friendly: "Rewrite the following text in a warm, welcoming, and friendly tone:",
  formal: "Rewrite the following text in a professional, articulate, and formal tone:",
};

export async function POST(req: Request) {
  try {
    const { prompt, action, customInstruction } = await req.json();

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return new Response("No text provided to process.", { status: 400 });
    }

    let instruction = promptMap[action] || "";
    if (!instruction) {
      if (customInstruction) {
        instruction = customInstruction;
      } else if (action) {
        instruction = `Perform the following task: "${action}" on this text:`;
      } else {
        instruction = "Improve and polish the following text:";
      }
    }

    const fullPrompt = `${instruction}\n\n${prompt.trim()}`;

    const result = streamText({
      model: ollama('llama3.2'),
      system: systemPrompt,
      prompt: fullPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("AI API Error:", error);
    return new Response(error.message || "Failed to generate AI completion", { status: 500 });
  }
}
