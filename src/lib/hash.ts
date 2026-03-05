// src/lib/hash.ts
export function uuidToBigint(uuid: string): bigint {
  const hex = uuid.replace(/-/g, "");
  const sliced = hex.slice(0, 15);
  return BigInt("0x" + sliced);
}

export function slotKeyToBigint(
  resourceId: string,
  scheduledISO: string,
): bigint {
  // composição simples: resourceId (uuid) + scheduledISO string hashed
  const pHex = resourceId.replace(/-/g, "").slice(0, 12); // 48 bits

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
