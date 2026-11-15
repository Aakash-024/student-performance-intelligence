/**
 * Z.ai GLM chat client for the V2 AI agents.
 *
 * Server-only by convention: this module is imported exclusively from server
 * actions, and the API key lives in ZAI_API_KEY (never NEXT_PUBLIC_*).
 *
 * Z.ai exposes an OpenAI-compatible chat completions endpoint, so a plain
 * fetch keeps the dependency count at zero and stays easy to swap later.
 */

const DEFAULT_API_BASE = "https://api.z.ai/api/paas/v4";
const DEFAULT_MODEL = "glm-4.6";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

function apiBase() {
  return (process.env.ZAI_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
}

function model() {
  return process.env.ZAI_MODEL || DEFAULT_MODEL;
}

/** True when an API key is present, so the UI can explain a missing setup. */
export function isAiConfigured() {
  return Boolean(process.env.ZAI_API_KEY);
}

/**
 * Runs a single non-streaming chat completion. Throws an Error with a
 * message safe to show to signed-in staff when the call fails.
 */
export async function chatComplete(options: ChatOptions) {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI is not configured on this deployment: the ZAI_API_KEY environment variable is missing.",
    );
  }

  const startedAt = Date.now();

  let response: Response;
  try {
    response = await fetch(`${apiBase()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model(),
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 1200,
        stream: false,
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "network error";
    throw new Error(`Could not reach the GLM API: ${message}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`GLM API returned ${response.status}. ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    model?: string;
  };

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("GLM API returned an empty response.");

  return {
    text,
    model: payload.model ?? model(),
    durationMs: Date.now() - startedAt,
  };
}

/**
 * GLM sometimes wraps JSON answers in ```json fences. This extracts the
 * outermost JSON object so callers can parse agent output defensively.
 */
export function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The model did not return a JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
