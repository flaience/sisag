import { existsSync, readFileSync } from "fs";

export function getPlatformSecret(name: string): string | null {
  const directValue = process.env[name];

  if (directValue && directValue.trim().length > 0) {
    return directValue.trim();
  }

  const filePath = process.env[`${name}_FILE`];

  if (!filePath || filePath.trim().length === 0) {
    return null;
  }

  const normalizedPath = filePath.trim();

  if (!existsSync(normalizedPath)) {
    return null;
  }

  const fileValue = readFileSync(normalizedPath, "utf8").trim();

  return fileValue.length > 0 ? fileValue : null;
}
