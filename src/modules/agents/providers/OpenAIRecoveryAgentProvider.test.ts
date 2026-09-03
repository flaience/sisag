import { describe, expect, it, vi } from "vitest";
import { OpenAIRecoveryAgentProvider } from "./OpenAIRecoveryAgentProvider";

const request = { system: "system", input: { score: 1 }, schemaName: "decision", jsonSchema: { type: "object" }, timeoutMs: 1000 };

describe("OpenAI recovery agent provider", () => {
  it("uses Responses structured output and maps usage metadata", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ model: "test-model", output: [{ type: "message", content: [{ type: "output_text", text: '{"suggestedAction":"human_contact"}' }] }], usage: { input_tokens: 12, output_tokens: 4 } }), { status: 200 }));
    const provider = new OpenAIRecoveryAgentProvider({ apiKey: "secret", model: "configured-model", fetch: fetchMock as typeof fetch });
    const result = await provider.complete(request);
    expect(result).toEqual({ output: { suggestedAction: "human_contact" }, model: "test-model", inputTokens: 12, outputTokens: 4 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(init.headers).toMatchObject({ authorization: "Bearer secret" });
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "configured-model", text: { format: { type: "json_schema", name: "decision", strict: true } } });
  });

  it("rejects provider errors without exposing response bodies", async () => {
    const provider = new OpenAIRecoveryAgentProvider({ apiKey: "secret", model: "model", fetch: vi.fn(async () => new Response("sensitive", { status: 401 })) as unknown as typeof fetch });
    await expect(provider.complete(request)).rejects.toThrow("provider_http_error");
  });

  it("rejects malformed provider payloads", async () => {
    const provider = new OpenAIRecoveryAgentProvider({ apiKey: "secret", model: "model", fetch: vi.fn(async () => new Response(JSON.stringify({ output: [] }), { status: 200 })) as unknown as typeof fetch });
    await expect(provider.complete(request)).rejects.toThrow("provider_invalid_response");
  });
});
