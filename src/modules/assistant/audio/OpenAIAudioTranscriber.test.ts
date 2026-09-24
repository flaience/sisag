import { describe, expect, it, vi } from "vitest";
import {
  OpenAIAudioTranscriber as Transcriber,
  OpenAIAudioTranscriptionError,
  OPENAI_AUDIO_TRANSCRIPTION_POLICY as policy,
} from "./OpenAIAudioTranscriber";

const input = { bytes: new Uint8Array([1, 2, 3]), mimeType: "audio/ogg; codecs=opus", language: "pt-BR", timeoutMs: 20_000 };
const errorCode = async (promise: Promise<unknown>) => {
  try { await promise; return "none"; }
  catch (error) { expect(error).toBeInstanceOf(OpenAIAudioTranscriptionError); return (error as OpenAIAudioTranscriptionError).code; }
};

describe("OpenAI audio transcriber", () => {
  it("posts bounded audio as multipart to the fixed transcription endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: " agenda da tarde " }), { status: 200 }));
    const transcriber = new Transcriber({ apiKey: "secret", fetch: fetcher });
    await expect(transcriber.transcribe(input)).resolves.toEqual({ text: "agenda da tarde" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(init).toMatchObject({ method: "POST", headers: { authorization: "Bearer secret" }, redirect: "error" });
    expect((init.headers as Record<string, string>)["content-type"]).toBeUndefined();
    const form = init.body as FormData;
    expect(form.get("model")).toBe(policy.defaultModel);
    expect(form.get("language")).toBe("pt");
    expect(form.get("response_format")).toBe("json");
    const file = form.get("file") as File;
    expect(file.type).toBe("audio/ogg");
    expect(file.name).toBe("whatsapp-audio.ogg");
    expect(file.size).toBe(3);
  });

  it("allows an explicit model without selecting one from global state", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: "olá" }), { status: 200 }));
    const transcriber = new Transcriber({ apiKey: "secret", model: "gpt-4o-transcribe", fetch: fetcher });
    await transcriber.transcribe(input);
    expect(((fetcher.mock.calls[0][1] as RequestInit).body as FormData).get("model")).toBe("gpt-4o-transcribe");
  });

  it.each([
    [{ ...input, bytes: new Uint8Array() }],
    [{ ...input, mimeType: "video/mp4" }],
    [{ ...input, language: "invalid-language" }],
    [{ ...input, timeoutMs: 0 }],
  ])("rejects invalid audio before network %#", async (invalid) => {
    const fetcher = vi.fn();
    const transcriber = new Transcriber({ apiKey: "secret", fetch: fetcher });
    expect(await errorCode(transcriber.transcribe(invalid))).toBe("invalid_audio");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("requires explicit credentials", () => {
    expect(() => new Transcriber({ apiKey: "" })).toThrowError(expect.objectContaining({ code: "invalid_configuration" }));
  });

  it("sanitizes HTTP, transport and malformed provider responses", async () => {
    const http = new Transcriber({ apiKey: "secret", fetch: vi.fn().mockResolvedValue(new Response("private", { status: 401 })) });
    expect(await errorCode(http.transcribe(input))).toBe("provider_http_error");
    const network = new Transcriber({ apiKey: "secret", fetch: vi.fn().mockRejectedValue(new Error("private")) });
    expect(await errorCode(network.transcribe(input))).toBe("network_error");
    const malformed = new Transcriber({ apiKey: "secret", fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: "" }), { status: 200 })) });
    expect(await errorCode(malformed.transcribe(input))).toBe("provider_invalid_response");
  });
});
