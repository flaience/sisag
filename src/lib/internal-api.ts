import { headers } from "next/headers";

async function getBaseUrl(): Promise<string> {
  const h = await headers();

  const host = h.get("x-forwarded-host") ?? h.get("host");

  const proto = h.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return "http://localhost:3000";
  }

  return `${proto}://${host}`;
}

export async function internalFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const baseUrl = await getBaseUrl();

  const res = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    ...init,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Internal API error ${res.status}: ${text}`);
  }

  return res.json();
}
