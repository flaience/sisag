import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("WhatsApp audio worker deploy boundary", () => {
  const worker = fs.readFileSync("src/workers/scheduling-automation-runner.mjs", "utf8");
  const deploy = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
  it("invokes the protected audio endpoint from the existing private runner", () => {
    expect(worker).toContain("/api/internal/automation/whatsapp-audio");
    expect(worker).toContain("http://app-frontend:3000");
    expect(worker).toContain("x-sisag-internal-secret");
  });
  it("requires and mounts only named audio secrets on the frontend", () => {
    for (const value of ["docker secret inspect", "wa_cloud_token_prod", "openai_api_key", "AUDIO_SECRET_ARGS", "--secret-add"]) expect(deploy).toContain(value);
    expect(deploy).not.toContain("OPENAI_API_KEY=");
    expect(deploy).not.toContain("WA_CLOUD_TOKEN=");
  });
  it("mounts secrets idempotently during the immutable image update", () => {
    expect(deploy).toContain("ContainerSpec.Secrets");
    expect(deploy).toContain('grep -Fxq "$SECRET_NAME"');
    expect(deploy).toContain('"${AUDIO_SECRET_ARGS[@]}"');
    expect(deploy).toContain('--image "$IMAGE"');
  });
});
