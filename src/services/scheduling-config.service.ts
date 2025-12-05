export async function getSchedulingConfig() {
  const res = await fetch("/api/v1/scheduling/config", { cache: "no-store" });
  if (!res.ok) throw new Error("Erro ao buscar config");
  return res.json();
}

export async function saveSchedulingConfig(payload: any) {
  const res = await fetch("/api/v1/scheduling/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Erro ao salvar config");
  return res.json();
}
