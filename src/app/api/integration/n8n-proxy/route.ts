// src/app/api/integration/n8n-proxy/route.ts
export const runtime = "nodejs"; // importante para fetch/headers em produção

const N8N_TARGET_URL =
  process.env.N8N_TARGET_URL || "https://n8n.flaience.com/webhook/sisag/outbox";
const OUTBOX_WEBHOOK_SECRET = process.env.OUTBOX_WEBHOOK_SECRET || "";

export async function POST(req: Request) {
  try {
    // 1) Auth (gatekeeper)
    const got = req.headers.get("x-sisag-secret") || "";
    if (!OUTBOX_WEBHOOK_SECRET) {
      return new Response(
        JSON.stringify({ ok: false, error: "server_misconfigured" }),
        {
          status: 500,
          headers: { "content-type": "application/json; charset=utf-8" },
        },
      );
    }
    if (got !== OUTBOX_WEBHOOK_SECRET) {
      return new Response(
        JSON.stringify({ ok: false, error: "unauthorized" }),
        {
          status: 401,
          headers: { "content-type": "application/json; charset=utf-8" },
        },
      );
    }

    // 2) Forward body as-is
    const bodyText = await req.text();

    // 3) Proxy to n8n (remove secret header; n8n não precisa ver isso)
    const res = await fetch(N8N_TARGET_URL, {
      method: "POST",
      headers: {
        "content-type": req.headers.get("content-type") || "application/json",
        // opcional: rastreabilidade
        "x-sisag-proxy": "vscode",
      },
      body: bodyText,
      // @ts-ignore - Next/node fetch aceita signal; timeout manual via AbortController se quiser evoluir
    });

    const contentType =
      res.headers.get("content-type") || "application/json; charset=utf-8";
    const resBody = await res.text();

    // 4) Retorna exatamente o status do n8n (normalmente 200) para o dispatcher entender sucesso
    return new Response(resBody, {
      status: res.status,
      headers: { "content-type": contentType },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "proxy_error",
        detail: String(e?.message || e),
      }),
      {
        status: 502,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }
}
