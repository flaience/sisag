import fs from "node:fs";
import { describe,expect,it } from "vitest";
const transcription=fs.readFileSync("src/modules/assistant/audio/WhatsAppAudioTranscription.ts","utf8"),provider=fs.readFileSync("src/modules/assistant/audio/OpenAIAudioTranscriber.ts","utf8"),runner=fs.readFileSync("src/modules/assistant/audio/WhatsAppAudioProcessingRunner.ts","utf8");
describe("WhatsApp audio failure observability",()=>{
 it("persists bounded provider-specific codes",()=>{for(const code of ["meta_metadata_http_error","meta_network_error","openai_auth_error","openai_quota_exhausted","openai_rate_limited","openai_network_error"])expect(transcription).toContain(code)});
 it("detects exhausted credit from structured fields only",()=>{expect(provider).toContain('providerCode === "credit_balance_exhausted"');expect(provider).toContain('providerType === "insufficient_quota"');expect(provider).not.toContain("error?.message")});
 it("does not retry terminal quota or credential failures",()=>{const retryBlock=runner.slice(runner.indexOf("const retryableErrors"),runner.indexOf("export class"));expect(retryBlock).not.toContain("openai_quota_exhausted");expect(retryBlock).not.toContain("openai_auth_error")});
 it("retains controlled retries for transient failures",()=>{for(const code of ["openai_rate_limited","openai_provider_http_error","openai_network_error","meta_network_error"])expect(runner).toContain(code)});
});
