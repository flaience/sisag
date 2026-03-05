import crypto from "crypto";

export function stableStringify(obj: any): string {
  // stringify determinístico (ordena chaves)
  const seen = new WeakSet();
  const sorter = (_k: string, v: any) => {
    if (v && typeof v === "object") {
      if (seen.has(v)) return "[Circular]";
      seen.add(v);
      if (Array.isArray(v)) return v;
      return Object.keys(v)
        .sort()
        .reduce((acc: any, key) => {
          acc[key] = v[key];
          return acc;
        }, {});
    }
    return v;
  };
  return JSON.stringify(obj, sorter);
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
