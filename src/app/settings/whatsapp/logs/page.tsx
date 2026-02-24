import * as React from "react";
import Link from "next/link";
import { internalFetch } from "@/lib/internal-api";
import type {
  WhatsAppLogsResponse,
  WhatsAppLogItem,
} from "@/modules/whatsapp/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function badgeVariant(status: WhatsAppLogItem["status"]) {
  if (status === "sent") return "default";
  if (status === "failed" || status === "dead") return "destructive";
  return "secondary";
}

async function getLogs(params: {
  limit?: number;
  cursor?: string;
  status?: string;
  q?: string;
}): Promise<WhatsAppLogsResponse> {
  const qs = new URLSearchParams();
  qs.set("limit", String(params.limit ?? 20));
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.status) qs.set("status", params.status);
  if (params.q) qs.set("q", params.q);

  return internalFetch<WhatsAppLogsResponse>(
    `/api/v1/admin/whatsapp/logs?${qs.toString()}`,
  );
}

export default async function Page(props: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<React.ReactElement> {
  const sp = props.searchParams ?? {};
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;

  const data = await getLogs({ limit: 20, cursor, status, q });

  return (
    <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">WhatsApp Logs</h1>
          <p className="text-muted-foreground">
            Outbox + envio (agora lendo do banco).
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings/whatsapp">Voltar</Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Últimos envios</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {data.items.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem registros.</div>
          ) : (
            <div className="space-y-2">
              {data.items.map((it) => (
                <div
                  key={it.outbox_id}
                  className="flex min-w-0 flex-col gap-2 rounded-md border p-3 sm:gap-1 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={badgeVariant(it.status)}>
                        {it.status}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground break-all md:max-w-[420px] md:truncate">
                        {it.outbox_id}
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="text-muted-foreground">Para:</span>{" "}
                      <span className="font-mono break-all">
                        {it.to_phone ?? "—"}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        • tentativas:
                      </span>{" "}
                      <span className="font-mono">{it.attempts}</span>
                    </div>

                    <div className="text-sm text-muted-foreground break-words">
                      {it.text_preview ?? "—"}
                    </div>

                    {it.last_error ? (
                      <div className="text-sm text-destructive break-words">
                        {it.last_error}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-xs text-muted-foreground md:text-right">
                    <div className="md:whitespace-nowrap">
                      {new Date(it.created_at).toLocaleString()}
                    </div>
                    <div className="font-mono break-all md:max-w-[260px] md:truncate">
                      {it.provider_message_id ?? "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginação */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              Mostrando {data.items.length} itens
            </div>

            <div className="flex gap-2">
              {data.next_cursor ? (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={{
                      pathname: "/settings/whatsapp/logs",
                      query: {
                        ...(status ? { status } : {}),
                        ...(q ? { q } : {}),
                        cursor: data.next_cursor,
                      },
                    }}
                  >
                    Próxima página
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Próxima página
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
