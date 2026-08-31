import type { SchedulingConfigInput } from "@/modules/scheduling-config/scheduling-config.schema";

type SchedulingConfigResponse = SchedulingConfigInput & { id: string };

export async function getSchedulingConfig() {
  const res = await fetch("/api/v1/settings/scheduling", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Erro ao buscar config");
  const body = (await res.json()) as {
    ok: boolean;
    config: SchedulingConfigResponse | null;
  };
  return body.config;
}

export async function saveSchedulingConfig(payload: SchedulingConfigInput) {
  const res = await fetch("/api/v1/settings/scheduling", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as {
    ok: boolean;
    error?: string;
    config: SchedulingConfigResponse;
  };
  if (!res.ok) throw new Error(body.error ?? "Erro ao salvar config");
  return body.config;
}
