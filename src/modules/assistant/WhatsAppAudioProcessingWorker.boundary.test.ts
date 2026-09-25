import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("WhatsApp audio processing worker boundary", () => {
  const worker = fs.readFileSync("src/modules/assistant/audio/WhatsAppAudioProcessingWorker.service.ts", "utf8");
  const route = fs.readFileSync("src/app/api/internal/automation/whatsapp-audio/route.ts", "utf8");
  it("selects only pending or expired work below the attempt limit", () => {
    for (const value of ['status, "pending"', 'status, "processing"', "leaseExpiresAt, now", "attempts, 3", ".limit(batchSize)"]) expect(worker).toContain(value);
  });
  it("bounds batches and returns aggregate metrics only", () => {
    expect(worker).toContain("Math.min(20, Math.max(1, value))");
    for (const value of ["scanned", "completed", "retryPending", "terminalFailed", "configurationSkipped"]) expect(worker).toContain(value);
    expect(worker).not.toContain("console.");
  });
  it("protects the internal route with the file-capable SISAG secret", () => {
    expect(route).toContain('readEnv("SISAG_INTERNAL_SECRET")');
    expect(route).toContain('x-sisag-internal-secret');
    expect(route).not.toContain("process.env.SISAG_INTERNAL_SECRET");
  });
});
