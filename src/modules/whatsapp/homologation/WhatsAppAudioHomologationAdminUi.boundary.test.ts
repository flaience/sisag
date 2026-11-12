import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/admin/settings/whatsapp/homologation/page.tsx", "utf8");

describe("WhatsApp audio homologation admin UI boundary", () => {
  it("accepts only supported audio and uses the authenticated transcription API", () => {
    expect(page).toContain('type="file"');
    expect(page).toContain('accept="audio/ogg,audio/mpeg,audio/mp4,audio/aac,audio/amr"');
    expect(page).toContain('/api/v1/settings/whatsapp/homologation/audio');
    expect(page).toContain('form.set("file", file)');
  });

  it("puts the transcript in the existing message field for review", () => {
    expect(page).toContain("setText(body.text)");
    expect(page).toContain("Revise o texto acima antes de executar a homologação");
    expect(page).toContain("disabled={running || transcribing");
    const transcription = page.slice(page.indexOf("async function transcribeAudio"), page.indexOf("async function run"));
    expect(transcription).not.toContain("void run()");
  });

  it("does not record send or execute a proposal from the audio control", () => {
    for (const forbidden of ["MediaRecorder", "Enviar ao WhatsApp", "Confirmar proposta", "executeBookingCommand"]) expect(page).not.toContain(forbidden);
  });
});
