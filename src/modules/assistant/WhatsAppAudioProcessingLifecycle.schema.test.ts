import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("WhatsApp audio processing schema", () => {
  const sql = fs.readFileSync("infra/whatsapp-audio-processing-lifecycle.sql", "utf8");
  it("is tenant-idempotent and queryable by processing state", () => {
    expect(sql).toContain("UNIQUE INDEX IF NOT EXISTS whatsapp_audio_processing_company_message_uq");
    expect(sql).toContain("(company_id,provider_message_id)");
    expect(sql).toContain("whatsapp_audio_processing_company_status_idx");
  });
  it("enforces states, retries, bounded transcript and RLS", () => {
    for (const value of ["pending','processing','completed','failed", "attempts BETWEEN 0 AND 3", "char_length(transcript) BETWEEN 1 AND 20000", "ENABLE ROW LEVEL SECURITY"]) expect(sql).toContain(value);
  });
});
