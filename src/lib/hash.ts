// src/lib/hash.ts
export function uuidToBigint(uuid: string): bigint {
  // pega a parte inicial do UUID sem hífens e transforma em bigint (suficiente para locking)
  const hex = uuid.replace(/-/g, "");
  // usa os primeiros 15 hex chars -> 60 bits
  const sliced = hex.slice(0, 15);
  return BigInt("0x" + sliced);
}

export function slotKeyToBigint(
  professionalId: string,
  scheduledISO: string
): bigint {
  // composição simples: professionalId (uuid) + scheduledISO string hashed
  // vamos criar um simples hash de string e somar com parte do uuid para ficar único
  const pHex = professionalId.replace(/-/g, "").slice(0, 12); // 48 bits
  // small JS FNV1a-like hash para scheduledISO
  let h = 2166136261 >>> 0;
  for (let i = 0; i < scheduledISO.length; i++) {
    h ^= scheduledISO.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const combinedHex = pHex + ("00000000" + h.toString(16)).slice(-8); // 12 + 8 = 20 hex chars
  const sliced = combinedHex.slice(0, 15);
  return BigInt("0x" + sliced);
}
