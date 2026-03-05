import fs from "node:fs";

export function readEnv(name: string): string | undefined {
  const filePath = process.env[`${name}_FILE`];
  if (filePath) {
    try {
      const v = fs.readFileSync(filePath, "utf8").trim();
      if (v) return v;
    } catch {
      // ignora e tenta env normal
    }
  }

  const v = process.env[name]?.trim();
  return v || undefined;
}
