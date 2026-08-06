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

  if (!res.ok) throw new Error("Erro ao salvar config");
  const body = (await res.json()) as {
    ok: boolean;
    config: SchedulingConfigResponse;
  };
  return body.config;
}
