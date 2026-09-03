import type { AgentProviderRequest, AgentProviderResponse, RecoveryAgentProvider } from "../RecoveryAgentRuntime";

type FetchLike = typeof fetch;

export class OpenAIRecoveryAgentProvider implements RecoveryAgentProvider {
  constructor(private readonly options: { apiKey: string; model: string; fetch?: FetchLike }) {}

  async complete(request: AgentProviderRequest): Promise<AgentProviderResponse> {
    const response = await (this.options.fetch ?? fetch)("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${this.options.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: this.options.model,
        instructions: request.system,
        input: JSON.stringify(request.input),
        text: { format: { type: "json_schema", name: request.schemaName, strict: true, schema: request.jsonSchema } },
      }),
      signal: AbortSignal.timeout(request.timeoutMs),
    });
    if (!response.ok) throw new Error("provider_http_error");
    const payload = await response.json() as { model?: unknown; output?: Array<{ type?: unknown; content?: Array<{ type?: unknown; text?: unknown }> }>; usage?: { input_tokens?: unknown; output_tokens?: unknown } };
    const text = payload.output?.flatMap(item => item.type === "message" ? item.content ?? [] : []).find(item => item.type === "output_text")?.text;
    if (typeof text !== "string" || typeof payload.model !== "string") throw new Error("provider_invalid_response");
    let output: unknown;
    try { output = JSON.parse(text); } catch { throw new Error("provider_invalid_response"); }
    return {
      output,
      model: payload.model,
      inputTokens: typeof payload.usage?.input_tokens === "number" ? payload.usage.input_tokens : undefined,
      outputTokens: typeof payload.usage?.output_tokens === "number" ? payload.usage.output_tokens : undefined,
    };
  }
}
