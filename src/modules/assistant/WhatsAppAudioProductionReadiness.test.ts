import fs from "node:fs";
import { describe, expect, it } from "vitest";

const files = (paths: string[]) => paths.map(path => fs.readFileSync(path, "utf8")).join("\n");
const webhook = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const runner = fs.readFileSync("src/workers/scheduling-automation-runner.mjs", "utf8");
const deploy = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
const lifecycle = fs.readFileSync("src/modules/assistant/audio/WhatsAppAudioProcessing.service.ts", "utf8");
const dispatch = fs.readFileSync("src/modules/assistant/audio/WhatsAppAudioTranscriptDispatch.service.ts", "utf8");

describe("WhatsApp audio production readiness", () => {
  it("acknowledges only after durable inbound receipt and audio enqueue", () => {
    expect(webhook.indexOf("saveMetaInboundMessage")).toBeLessThan(webhook.indexOf("WhatsAppAudioProcessingService.enqueue"));
    expect(webhook.indexOf("WhatsAppAudioProcessingService.enqueue")).toBeLessThan(webhook.indexOf("return NextResponse.json({ ok: true, debug })"));
    expect(webhook).toContain("AudioEnqueueStorageError");
  });
  it("keeps network and model calls outside the public webhook", () => {
    for (const forbidden of ["OpenAIAudioTranscriber", "MetaWhatsAppMediaDownloader", "transcribeAuthorizedWhatsAppAudio"]) expect(webhook).not.toContain(forbidden);
    expect(webhook).toContain('if (inbound.kind === "audio")');
    expect(webhook).toContain("continue;");
  });
  it("uses tenant-scoped Docker Secret references and explicit Meta version", () => {
    const source = files(["src/modules/assistant/audio/WhatsAppAudioSecretResolver.ts", "src/modules/assistant/audio/WhatsAppAudioProcessingWorker.service.ts", "src/modules/assistant/audio/WhatsAppAudioProcessingRunner.ts", "src/modules/assistant/audio/MetaWhatsAppAudioOrchestrator.ts"]);
    for (const value of ["metaAccessTokenSecret", "openAIApiKeySecret", "metaGraphVersion", "graphVersion: input.metaGraphVersion", "eq(whatsappAccounts.companyId"]) expect(source).toContain(value);
    expect(source).not.toContain("process.env.OPENAI_API_KEY");
  });
  it("bounds media, transcription, processing attempts and leases", () => {
    const source = files(["src/modules/assistant/audio/WhatsAppAudioTranscription.ts", "src/modules/assistant/audio/OpenAIAudioTranscriber.ts", "src/modules/assistant/audio/WhatsAppAudioProcessing.service.ts"]);
    for (const value of ["maximumBytes", "maximumDurationSeconds", "timeoutMs", "maximumAttempts", "leaseExpiresAt"]) expect(source).toContain(value);
  });
  it("persists the transcript before a separately leased assistant dispatch", () => {
    expect(lifecycle).not.toContain("AssistantWhatsAppService");
    for (const value of ["dispatchLeaseToken", "dispatchedAt", "correlationId: claimed.providerMessageId", "AssistantWhatsAppService.handleInbound"]) expect(dispatch).toContain(value);
  });
  it("uses the committed reply as crash-safe idempotency evidence", () => {
    const source = files(["src/modules/assistant/CommittedWhatsAppReply.ts", "src/modules/assistant/AssistantWhatsApp.service.ts", "src/modules/assistant/audio/WhatsAppAudioTranscriptDispatch.service.ts"]);
    for (const value of ["wa_send:", "hasCommittedWhatsAppReply", "replayed: true", "providerMessageId"]) expect(source).toContain(value);
  });
  it("runs one audio per cycle with an isolated timeout budget", () => {
    expect(runner).toContain('path==="/api/internal/automation/whatsapp-audio"');
    expect(runner).toContain("JSON.stringify({batchSize:1})");
    expect(runner).toContain("Math.max(timeoutMs,55_000)");
  });
  it("fails deployment when required secrets are absent and never embeds credentials", () => {
    for (const value of ["docker secret inspect", "wa_cloud_token_prod", "openai_api_key", "--secret-add"]) expect(deploy).toContain(value);
    for (const forbidden of ["OPENAI_API_KEY=", "META_ACCESS_TOKEN="]) expect(deploy).not.toContain(forbidden);
  });
});
