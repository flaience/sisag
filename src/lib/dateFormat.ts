export function isoToBr(isoDate: string | null | undefined) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  return `${dia}-${mes}-${ano}`;
}

export function brToIso(brDate: string) {
  if (!brDate) return null;
  const [dia, mes, ano] = brDate.split("-");
  if (!dia || !mes || !ano) return null;
  return `${ano}-${mes}-${dia}`;
}

export function isoToInputValue(isoDate: string | null | undefined) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
