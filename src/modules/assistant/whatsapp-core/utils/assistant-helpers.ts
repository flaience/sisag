import { formatPtBr } from "@/lib/time";

export function normalizeYesNo(text: string): "YES" | "NO" | "OTHER" {
  const t = (text || "").trim().toLowerCase();
  if (["sim", "s", "yes", "y", "ok", "confirmo", "confirmar"].includes(t))
    return "YES";
  if (["não", "nao", "n", "no"].includes(t)) return "NO";
  return "OTHER";
}

export function parseChoiceIndex(text: string): number | null {
  const t = (text || "").trim();
  if (!/^[1-3]$/.test(t)) return null;
  return Number(t) - 1;
}

export function composeCancelOptions(
  options: Array<{ appointmentId: string; scheduledTimeUtc: string }>,
) {
  const lines = options.slice(0, 3).map((opt, idx) => {
    const when = formatPtBr(opt.scheduledTimeUtc);
    return `${idx + 1}) ${when}`;
  });

  return `Encontrei mais de um agendamento.\n\nQual você quer cancelar?\n${lines.join(
    "\n",
  )}\n\nResponda com *1*, *2* ou *3*.`;
}
