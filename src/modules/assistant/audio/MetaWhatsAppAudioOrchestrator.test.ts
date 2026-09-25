import { describe, expect, it, vi } from "vitest";
import { orchestrateMetaWhatsAppAudio as orchestrate } from "./MetaWhatsAppAudioOrchestrator";

const input = {
  accessToken: "tenant-scoped-token",
  graphVersion: "v25.0",
  media: { mediaId: "media-1", mimeType: "audio/ogg", voice: true },
};
const metadata = () => new Response(JSON.stringify({
  id: "media-1",
  url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=media-1",
  mime_type: "audio/ogg",
  file_size: 3,
}), { status: 200, headers: { "content-type": "application/json" } });
const media = () => new Response(new Uint8Array([1, 2, 3]), {
  status: 200,
  headers: { "content-type": "audio/ogg", "content-length": "3" },
});

describe("Meta WhatsApp audio orchestration", () => {
  it("composes authenticated download and injected transcription", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(metadata()).mockResolvedValueOnce(media());
    const transcribe = vi.fn().mockResolvedValue({ text: " agendar amanhã às dez ", confidence: 0.93 });
    await expect(orchestrate(input, { fetch: fetcher, transcribe })).resolves.toEqual({
      ok: true,
      text: "agendar amanhã às dez",
      confidence: 0.93,
      policyVersion: "whatsapp_audio_v1",
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][0]).toContain("/v25.0/media-1");
    expect(fetcher.mock.calls[0][1].headers).toEqual({ authorization: "Bearer tenant-scoped-token" });
    expect(transcribe).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      bytes: new Uint8Array([1, 2, 3]), mimeType: "audio/ogg", language: "pt-BR",
    }));
  });

  it("rejects incomplete metadata before using credentials or network", async () => {
    const fetcher = vi.fn();
    const transcribe = vi.fn();
    await expect(orchestrate({ ...input, media: { ...input.media, mimeType: null } }, { fetch: fetcher, transcribe }))
      .resolves.toMatchObject({ ok: false, error: "unsupported_audio_type" });
    expect(fetcher).not.toHaveBeenCalled();
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("fails closed when tenant credentials are unavailable", async () => {
    const fetcher = vi.fn();
    const transcribe = vi.fn();
    await expect(orchestrate({ ...input, accessToken: "" }, { fetch: fetcher, transcribe }))
      .resolves.toEqual({ ok: false, error: "transcription_failed", policyVersion: "whatsapp_audio_v1" });
    expect(fetcher).not.toHaveBeenCalled();
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("sanitizes downloader and transcription failures", async () => {
    const networkFetch = vi.fn().mockRejectedValue(new Error("private network detail"));
    await expect(orchestrate(input, { fetch: networkFetch, transcribe: vi.fn() }))
      .resolves.toEqual({ ok: false, error: "transcription_failed", policyVersion: "whatsapp_audio_v1" });

    const fetcher = vi.fn().mockResolvedValueOnce(metadata()).mockResolvedValueOnce(media());
    const transcribe = vi.fn().mockRejectedValue(new Error("private provider detail"));
    await expect(orchestrate(input, { fetch: fetcher, transcribe }))
      .resolves.toEqual({ ok: false, error: "transcription_failed", policyVersion: "whatsapp_audio_v1" });
  });
});
